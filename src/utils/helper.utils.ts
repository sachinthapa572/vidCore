import type { CookieOptions } from "hono/utils/cookie";

import type { IUser } from "@/db/models/user.model";

export function colorCyan(text: string): string {
  return `\x1B[36m${text}\x1B[0m`;
}

export const cookiesOptions: CookieOptions = {
  path: "/",
  secure: true,
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000), // 7 days from now
  sameSite: "Strict",
};

export const formatUserProfile = (user: IUser): Omit<IUser, "password" | "watchHistory"> => {
  return {
    _id: user._id,
    email: user.email,
    avatar: user.avatar,
    username: user.username,
    fullName: user.fullName,
    coverImage: user.coverImage,
    refreshToken: user.refreshToken,
  };
};
