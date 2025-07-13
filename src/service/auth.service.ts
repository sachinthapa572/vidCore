import { sign } from "hono/jwt";
import { encodeBase64 } from "hono/utils/encode";
import type { UploadResponse } from "imagekit/dist/libs/interfaces";
import type IKResponse from "imagekit/dist/libs/interfaces/IKResponse";
import type { HydratedDocument, Types } from "mongoose";

import appEnv from "@/db/env";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { throwError } from "@/utils/api-error";
import { formatUserProfile, type UserProfile } from "@/utils/helper.utils";

import { imageKitService } from "../config/imagekit";
import { type IUser, User } from "../db/models/user.model";
import type {
  UpdateImageInput,
  UserLoginInput,
  UserValidationInput,
} from "../validation/user.validation";

export const AuthService = {
  async registerUser(data: UserValidationInput): Promise<UserProfile> {
    const existingUser = await User.findOne({
      $or: [{ email: data.email }, { username: data.username }],
    }).lean();

    if (existingUser) {
      throwError(HttpStatusCode.CONFLICT, "User already exists", "USER_EXISTS");
    }

    const avatarUpload = { url: "", publicId: "" };
    const coverUpload = { url: "", publicId: "" };

    const uploadPromises = [];

    if (data.avatar) {
      const avatarFile = data.avatar;
      uploadPromises.push(
        avatarFile
          .arrayBuffer()
          .then(buffer =>
            imageKitService.upload({
              file: encodeBase64(buffer),
              fileName: avatarFile.name,
              folder: "/avatars",
            })
          )
          .then(result => ({ type: "avatar", result }))
      );
    }

    if (data.coverImage) {
      const coverImageFile = data.coverImage;
      uploadPromises.push(
        coverImageFile
          .arrayBuffer()
          .then(buffer =>
            imageKitService.upload({
              file: encodeBase64(buffer),
              fileName: coverImageFile.name,
              folder: "/coverImages",
            })
          )
          .then(result => ({ type: "coverImage", result }))
      );
    }

    if (uploadPromises.length > 0) {
      const uploads = await Promise.all(uploadPromises);
      uploads.forEach(upload => {
        if (upload.type === "avatar") {
          avatarUpload.url = upload.result.url;
          avatarUpload.publicId = upload.result.fileId;
        } else if (upload.type === "coverImage") {
          coverUpload.url = upload.result.url;
          coverUpload.publicId = upload.result.fileId;
        }
      });
    }

    // Create the user
    const created = await User.create({
      fullName: data.fullName,
      email: data.email,
      username: data.username,
      password: data.password,
      avatar: {
        url: avatarUpload.url || undefined,
        publicId: avatarUpload.publicId || undefined,
      },
      coverImage: {
        url: coverUpload.url || undefined,
        publicId: coverUpload.publicId || undefined,
      },
    });

    return formatUserProfile(created);
  },

  async loginUser(data: UserLoginInput) {
    const existingUser = await User.findOne({ email: data.email });

    if (!existingUser) {
      return throwError(HttpStatusCode.NOT_FOUND, "User not found", "USER_NOT_FOUND");
    }

    const isPasswordValid = await existingUser.isPasswordCorrect(data.password);
    if (!isPasswordValid) {
      return throwError(HttpStatusCode.UNAUTHORIZED, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const userId = existingUser._id.toString();
    const token = await generateJwtToken(userId);

    // Remove password field before returning user
    const updatedUser: HydratedDocument<IUser> | null = await User.findByIdAndUpdate(
      existingUser._id,
      { refreshToken: token },
      { new: true }
    );

    if (!updatedUser) {
      return throwError(
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        "Failed to update refresh token",
        "TOKEN_UPDATE_FAILED"
      );
    }

    return formatUserProfile(updatedUser);
  },

  async logoutUser(userId: Types.ObjectId) {
    await User.findByIdAndUpdate(
      userId,
      {
        $unset: {
          refreshToken: 1,
        },
      },
      {
        new: true,
      }
    );
  },

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      return throwError(
        HttpStatusCode.UNAUTHORIZED,
        "Refresh token is required",
        "REFRESH_TOKEN_REQUIRED"
      );
    }

    const user = await User.findOne({ refreshToken: refreshToken });

    if (!user) {
      return throwError(
        HttpStatusCode.UNAUTHORIZED,
        "Invalid refresh token",
        "INVALID_REFRESH_TOKEN"
      );
    }

    const userId = user._id.toString();
    const newAccessToken = await generateJwtToken(userId);
    const newRefreshToken = await generateJwtToken(userId);

    // Update the user's refresh token
    const updatedUser: HydratedDocument<IUser> | null = await User.findByIdAndUpdate(
      user._id,
      { refreshToken: newRefreshToken },
      { new: true }
    );

    if (!updatedUser) {
      return throwError(
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        "Failed to update refresh token",
        "TOKEN_UPDATE_FAILED"
      );
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: formatUserProfile(updatedUser),
    };
  },

  async updatePassword(data: { userId: Types.ObjectId; oldPassword: string; newPassword: string }) {
    const { userId, oldPassword, newPassword } = data;

    const user = await User.findById(userId);

    if (!user) {
      return throwError(HttpStatusCode.NOT_FOUND, "User not found", "USER_NOT_FOUND");
    }

    const isOldPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isOldPasswordValid) {
      return throwError(
        HttpStatusCode.UNAUTHORIZED,
        "Old password is incorrect",
        "INCORRECT_OLD_PASSWORD"
      );
    }

    user.password = newPassword;
    await user.save();

    return;
  },

  async updateImage(data: UpdateImageInput, id: Types.ObjectId) {
    const user = await User.findById(id);

    if (!user) {
      return throwError(HttpStatusCode.NOT_FOUND, "User not found", "USER_NOT_FOUND");
    }

    // Delete existing images if replacing
    if (data.avatar && user.avatar?.publicId) {
      await imageKitService.delete(user.avatar.publicId);
    }
    if (data.coverImage && user.coverImage?.publicId) {
      await imageKitService.delete(user.coverImage.publicId);
    }
    // Prepare upload result containers
    const avatarUpload = { url: "", publicId: "" };
    const coverUpload = { url: "", publicId: "" };

    const uploadPromises = [];

    if (data.avatar) {
      const avatarFile = data.avatar;
      uploadPromises.push(
        avatarFile
          .arrayBuffer()
          .then(buffer =>
            imageKitService.upload({
              file: encodeBase64(buffer),
              fileName: avatarFile.name,
              folder: "/avatars",
            })
          )
          .then(result => ({ type: "avatar", result }))
      );
    }

    if (data.coverImage) {
      const coverImageFile = data.coverImage;
      uploadPromises.push(
        coverImageFile
          .arrayBuffer()
          .then(buffer =>
            imageKitService.upload({
              file: encodeBase64(buffer),
              fileName: coverImageFile.name,
              folder: "/coverImages",
            })
          )
          .then(result => ({ type: "coverImage", result }))
      );
    }

    let uploads: Array<{ type: string; result: IKResponse<UploadResponse> }> = [];
    if (uploadPromises.length > 0) {
      uploads = await Promise.all(uploadPromises);
      uploads.forEach(upload => {
        if (upload.type === "avatar") {
          avatarUpload.url = upload.result.url;
          avatarUpload.publicId = upload.result.fileId;
        } else if (upload.type === "coverImage") {
          coverUpload.url = upload.result.url;
          coverUpload.publicId = upload.result.fileId;
        }
      });
    }

    // Build update payload
    const updateFields: {
      avatar?: { url: string; publicId: string };
      coverImage?: { url: string; publicId: string };
    } = {};
    if (avatarUpload.publicId) {
      updateFields.avatar = {
        url: avatarUpload.url,
        publicId: avatarUpload.publicId,
      };
    }
    if (coverUpload.publicId) {
      updateFields.coverImage = {
        url: coverUpload.url,
        publicId: coverUpload.publicId,
      };
    }
    const updatedUser: HydratedDocument<IUser> | null = await User.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!updatedUser) {
      return throwError(
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        "Failed to update images",
        "IMAGE_UPDATE_FAILED"
      );
    }

    return {
      coverImage: updatedUser.coverImage,
      avatar: updatedUser.avatar,
    };
  },
};

// Generate the Token
export const generateJwtToken = async (key: string): Promise<string> => {
  try {
    return await sign({ userId: key }, appEnv.JWT_SECRET);
  } catch (_error) {
    return throwError(
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      "Failed to generate token",
      "TOKEN_GENERATION_FAILED"
    );
  }
};
