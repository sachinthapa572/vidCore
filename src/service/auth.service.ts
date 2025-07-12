// auth.service.ts - Fixed version
import { sign } from "hono/jwt";
import { encodeBase64 } from "hono/utils/encode";
import type { HydratedDocument } from "mongoose";

import appEnv from "@/db/env";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { throwError } from "@/utils/api-error";
import { formatUserProfile } from "@/utils/helper.utils";

import { imageKitService } from "../config/imagekit";
import { type IUser, User } from "../db/models/user.model";
import type { UserLoginInput, UserValidationInput } from "../validation/user.validation";

export const AuthService = {
  async registerUser(data: UserValidationInput): Promise<IUser> {
    const existingUser = await User.findOne({
      $or: [{ email: data.email }, { username: data.username }],
    }).lean();

    if (existingUser) {
      throwError(HttpStatusCode.CONFLICT, "User already exists", "USER_EXISTS");
    }

    let avatarUpload = { url: "" };
    let coverUpload = { url: "" };

    if (data.avatar && data.coverImage) {
      const [avatarBuffer, coverBuffer] = await Promise.all([
        data.avatar.arrayBuffer(),
        data.coverImage.arrayBuffer(),
      ]);

      const [avatarBase64, coverBase64] = [encodeBase64(avatarBuffer), encodeBase64(coverBuffer)];

      [avatarUpload, coverUpload] = await Promise.all([
        imageKitService.upload({
          file: avatarBase64,
          fileName: data.avatar.name,
          folder: "/avatars",
        }),
        imageKitService.upload({
          file: coverBase64,
          fileName: data.coverImage.name,
          folder: "/coverImages",
        }),
      ]);
    }

    // Create the user
    const created = await User.create({
      fullName: data.fullName,
      email: data.email,
      username: data.username,
      password: data.password,
      avatar: avatarUpload.url || undefined,
      coverImage: coverUpload.url || undefined,
    });

    return created;
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
