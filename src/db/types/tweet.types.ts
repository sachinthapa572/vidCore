import type { Document, Model } from "mongoose";
import type mongoose from "mongoose";

export type ITweet = {
  content: string;
  owner: mongoose.Types.ObjectId;
} & Document;

export type TweetModel = Model<ITweet>;
