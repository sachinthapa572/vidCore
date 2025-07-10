import type mongoose from "mongoose";
import type { Document, Model } from "mongoose";

export type ISubscription = {
  subscriber: mongoose.Types.ObjectId;
  channel: mongoose.Types.ObjectId;
} & Document;

export type SubscriptionModel = Model<ISubscription>;
