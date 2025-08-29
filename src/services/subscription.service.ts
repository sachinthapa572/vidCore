import type { Types } from "mongoose";

import { Subscription } from "@/db/models/subscription.model";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { userService } from "@/services/user.service";
import { throwError } from "@/utils/api-error";

export const toggleSubscription = async (data: {
  channelId: Types.ObjectId;
  subscriberId: Types.ObjectId;
}) => {
  const { channelId, subscriberId } = data;

  if (subscriberId.equals(channelId)) {
    throwError(HttpStatusCode.BAD_REQUEST, "You cannot subscribe to your own channel");
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  if (existingSubscription) {
    await Subscription.findByIdAndDelete(existingSubscription._id);
    await userService.updateUserTweetEligibility(channelId);
    return { message: "Unsubscribed successfully", subscribed: false };
  }

  await Subscription.create({
    subscriber: subscriberId,
    channel: channelId,
  });

  await userService.updateUserTweetEligibility(channelId);

  return { message: "Subscribed successfully", subscribed: true };
};

export const getUserChannelSubscribers = async (data: { channelId: Types.ObjectId }) => {
  const { channelId } = data;

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: channelId,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
      },
    },
    {
      $project: {
        _id: 1,
        subscriber: {
          $arrayElemAt: ["$subscriberDetails", 0],
        },
        createdAt: 1,
        updatedAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  if (!subscribers?.length) {
    throwError(HttpStatusCode.NOT_FOUND, "No subscribers found for this channel");
  }

  return subscribers;
};

export const getSubscribedChannels = async (data: { subscriberId: Types.ObjectId }) => {
  const { subscriberId } = data;

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: subscriberId,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelDetails",
      },
    },
    {
      $project: {
        _id: 1,
        channel: {
          $arrayElemAt: ["$channelDetails", 0],
        },
        createdAt: 1,
        updatedAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  if (!subscribedChannels?.length) {
    throwError(HttpStatusCode.NOT_FOUND, "No subscribed channels found");
  }

  return subscribedChannels;
};

export const subscriptionService = {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
};

export default subscriptionService;
