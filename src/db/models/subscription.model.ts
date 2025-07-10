import mongoose, { Schema } from "mongoose";

import type { ISubscription, SubscriptionModel } from "../types/subscription.types";

const subscriptionSchema = new Schema<ISubscription, SubscriptionModel>(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // one who is subscribing
      ref: "User",
      required: [true, "Subscriber is required"],
    },
    channel: {
      type: Schema.Types.ObjectId, // one to whom 'subscriber' is subscribing
      ref: "User",
      required: [true, "Channel is required"],
    },
  },
  { timestamps: true },
);

export const Subscription = mongoose.model<ISubscription, SubscriptionModel>("Subscription", subscriptionSchema);
