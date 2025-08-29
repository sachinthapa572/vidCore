import { type Model, model, Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

import type { ObjectId, WithDoc } from "@/types/type";

type Methods = {
  isOwnedBy(userId: ObjectId): boolean;
};

export type ITweet = WithDoc<{
  content: string;
  owner: ObjectId;
  isPinned: boolean;
}> &
  Methods;

export type TweetModel = Model<ITweet>;

const tweetSchema = new Schema<ITweet, TweetModel, Methods>(
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
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Instance method to check if tweet is owned by a user
tweetSchema.methods.isOwnedBy = function (userId: ObjectId): boolean {
  return this.owner.equals(userId);
};

// Add aggregation plugin for advanced queries with hints
tweetSchema.plugin(mongooseAggregatePaginate);

export const Tweet = model<ITweet>("Tweet", tweetSchema);
