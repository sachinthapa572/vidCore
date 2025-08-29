import { type Model, model, Schema, type Types } from "mongoose";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { throwError } from "@/utils/api-error";

export type Methods = {
  isPasswordCorrect(pwd: string): Promise<boolean>;
};

export type IUser = {
  _id: Types.ObjectId;
  username: string;
  email: string;
  fullName: string;
  avatar?: {
    url: string;
    publicId: string;
  };
  coverImage?: {
    url: string;
    publicId: string;
  };
  watchHistory: Types.ObjectId[];
  password: string;
  refreshToken: string;
  canTweet: boolean;
  totalViews: number;
  totalSubscribers: number;
};

export const userSchema = new Schema<IUser, Model<IUser>, Methods>(
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
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },
    coverImage: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
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
    canTweet: {
      type: Boolean,
      default: false,
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    totalSubscribers: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
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

userSchema.statics.checkValidUser = async function (id: Types.ObjectId) {
  const user = await this.findById(id);
  if (!user) {
    return throwError(HttpStatusCode.NOT_FOUND, "User not found");
  }
  return user;
};

userSchema.virtual("avatarUrl").get(function () {
  return this.avatar?.url;
});

// ✅ Export the model
export const User = model("User", userSchema);
