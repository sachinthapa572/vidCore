import { type Model, model, Schema } from "mongoose";

import type { ObjectId, WithDoc } from "@/types/type";

export type Methods = {
  isPasswordCorrect(pwd: string): Promise<boolean>;
};

export type IUser = WithDoc<{
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  coverImage?: string;
  watchHistory: ObjectId[];
  password: string;
  refreshToken?: string;
}> &
  Methods;

export type UserModel = Model<IUser>;

const userSchema = new Schema<IUser, UserModel, Methods>(
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
      index: true,
      match: [/^[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, "Please fill a valid email address"],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
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
    toJSON: {
      transform: (_doc, ret) => {
        // delete ret.password;
        // delete ret.refreshToken;
        return ret;
      },
    },
  }
);

// ✅ Password hash hook
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await Bun.password.hash(this.password, {
      algorithm: "argon2d",
    });
    next();
  } catch (err) {
    next(err as Error);
  }
});

// ✅ Instance method
userSchema.methods.isPasswordCorrect = async function (this: IUser, pwd: string) {
  return await Bun.password.verify(pwd, this.password);
};

// ✅ Export the model
export const User = model<IUser>("User", userSchema);
