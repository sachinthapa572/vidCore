import mongoose, { Schema } from "mongoose";

import type { ILike, LikeModel } from "../types/like.types";

const likeSchema = new Schema<ILike, LikeModel>(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Liked by is required"],
    },

  },
  { timestamps: true },
);

export const Like = mongoose.model<ILike, LikeModel>("Like", likeSchema);
