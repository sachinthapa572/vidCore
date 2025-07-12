import type { Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

import type { ObjectId, WithDoc } from "@/types/type";

export type ITweet = WithDoc<{
  content: string;
  owner: ObjectId;
}>;

export type TweetModel = Model<ITweet>;

const tweetSchema = new Schema<ITweet, TweetModel>(
  {
    content: {
      type: String,
      required: [true, "Content is required"],
      maxlength: [280, "Tweet cannot be more than 280 characters"],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
    },
  },
  { timestamps: true }
);

export const Tweet = mongoose.model<ITweet, TweetModel>("Tweet", tweetSchema);
