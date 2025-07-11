import mongoose, { Schema } from "mongoose";

import type { IUser, UserModel } from "../types/user.types";

const userSchema = new Schema<IUser, UserModel>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [20, "Username must be no more than 20 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i, "Please fill a valid email address"],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary url
      required: true,
    },
    coverImage: {
      type: String, // cloudinary url
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await Bun.password.hash(this.password, {
      algorithm: "argon2d",
    });
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.isPasswordCorrect = async function (password: string) {
  if (!this.password) return false;
  return await Bun.password.verify(password, this.password);
};

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
