import type mongoose from "mongoose";
import type { Document, Model } from "mongoose";

export type IUser = {
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  coverImage?: string;
  watchHistory: mongoose.Types.ObjectId[];
  password: string;
  refreshToken?: string;
  isPasswordCorrect: (password: string) => Promise<boolean>;
} & Document;

export type UserModel = Model<IUser>;
