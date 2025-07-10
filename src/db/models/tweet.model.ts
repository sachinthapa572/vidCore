import mongoose, { Schema } from "mongoose";

import type { ITweet, TweetModel } from "../types/tweet.types";

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
  { timestamps: true },
);

export const Tweet = mongoose.model<ITweet, TweetModel>("Tweet", tweetSchema);
