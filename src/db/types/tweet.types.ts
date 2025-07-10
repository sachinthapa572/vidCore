import type { Document, Model, Schema } from "mongoose";

export type ITweet = {
  content: string;
  owner: Schema.Types.ObjectId;
} & Document;

export type TweetModel = Model<ITweet>;
