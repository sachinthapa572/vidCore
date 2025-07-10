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

// Prevent duplicate subscriptions
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

// Add custom validation to prevent self-subscription
subscriptionSchema.pre("save", function (next) {
  if (this.subscriber.equals(this.channel)) {
    next(new Error("Users cannot subscribe to themselves"));
  }
  else {
    next();
  }
});
export const Subscription = mongoose.model<ISubscription, SubscriptionModel>("Subscription", subscriptionSchema);
