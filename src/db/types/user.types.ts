// import type { JwtPayload } from "jsonwebtoken";
import type { Document, Model } from "mongoose";

export type IUser = {
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  coverImage?: string;
  watchHistory: string[];
  password: string;
  refreshToken?: string;
  isPasswordCorrect: (password: string) => Promise<boolean>;
  generateAccessToken: () => string;
  generateRefreshToken: () => string;
} & Document;

export type UserModel = Model<IUser>;
