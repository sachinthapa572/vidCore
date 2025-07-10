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

likeSchema.pre("validate", function (next) {
  const likedItemCount = [this.video, this.comment, this.tweet].filter(Boolean).length;
  if (likedItemCount !== 1) {
    return next(new Error("A like must be associated with exactly one item (video, comment, or tweet)."));
  }
  next();
});
export const Like = mongoose.model<ILike, LikeModel>("Like", likeSchema);
