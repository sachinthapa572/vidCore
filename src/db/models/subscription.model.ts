import { type Model, model, Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

import type { ObjectId, WithDoc } from "@/types/type";

type Methods = {
  isOwnedBy(userId: ObjectId): boolean;
};

export type ISubscription = WithDoc<{
  subscriber: ObjectId;
  channel: ObjectId;
}> &
  Methods;

export type SubscriptionModel = Model<ISubscription>;

const subscriptionSchema = new Schema<ISubscription, SubscriptionModel, Methods>(
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
  { timestamps: true }
);

// Instance method to check if subscription is owned by a user
subscriptionSchema.methods.isOwnedBy = function (userId: ObjectId): boolean {
  return this.subscriber.equals(userId);
};

// Prevent duplicate subscriptions
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

// Add aggregation plugin for advanced queries with hints
subscriptionSchema.plugin(mongooseAggregatePaginate);

// Add custom validation to prevent self-subscription
subscriptionSchema.pre("save", function (next) {
  if (this.subscriber.equals(this.channel)) {
    next(new Error("Users cannot subscribe to themselves"));
  } else {
    next();
  }
});

export const Subscription = model<ISubscription>("Subscription", subscriptionSchema);
