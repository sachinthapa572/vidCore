import type { Document, Model, Schema } from "mongoose";

export type ISubscription = {
  subscriber: Schema.Types.ObjectId;
  channel: Schema.Types.ObjectId;
} & Document;

export type SubscriptionModel = Model<ISubscription>;
