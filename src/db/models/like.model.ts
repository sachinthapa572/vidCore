import type { Model } from "mongoose";
import { model, Schema } from "mongoose";

import type { ObjectId, WithDoc } from "@/types/type";

export type ILike = WithDoc<{
  video?: ObjectId;
  comment?: ObjectId;
  tweet?: ObjectId;
  likedBy: ObjectId;
}>;

export type LikeModel = Model<ILike>;

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
  { timestamps: true }
);

likeSchema.pre("validate", function (next) {
  const likedItemCount = [this.video, this.comment, this.tweet].filter(Boolean).length;
  if (likedItemCount !== 1) {
    return next(
      new Error("A like must be associated with exactly one item (video, comment, or tweet).")
    );
  }
  next();
});
export const Like = model<ILike>("Like", likeSchema);
