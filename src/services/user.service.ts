import type { Types } from "mongoose";

import { Subscription } from "@/db/models/subscription.model";
import { User } from "@/db/models/user.model";
import { Video } from "@/db/models/video.model";

// Helper function to get total views for a user's videos
const getUserTotalViews = async (userId: Types.ObjectId): Promise<number> => {
  const result = await Video.aggregate([
    { $match: { owner: userId, isPublished: true } },
    { $group: { _id: null, totalViews: { $sum: "$views" } } },
  ]);

  return result.length > 0 ? result[0].totalViews : 0;
};

// Helper function to get total subscriber count for a user
const getUserSubscriberCount = async (userId: Types.ObjectId): Promise<number> => {
  const count = await Subscription.countDocuments({ channel: userId });
  return count;
};

// Update user's tweet eligibility status
const updateUserTweetEligibility = async (userId: Types.ObjectId): Promise<void> => {
  const [totalViews, subscriberCount] = await Promise.all([
    getUserTotalViews(userId),
    getUserSubscriberCount(userId),
  ]);

  const MIN_VIEWS = 10000; // 10K views
  const MIN_SUBSCRIBERS = 5000; // 5K subscribers

  const canTweet = totalViews >= MIN_VIEWS && subscriberCount >= MIN_SUBSCRIBERS;

  await User.findByIdAndUpdate(userId, {
    canTweet,
    totalViews,
    totalSubscribers: subscriberCount,
  });
};

const canUserTweet = async (userId: Types.ObjectId): Promise<boolean> => {
  const user = await User.findById(userId).select("canTweet");
  return user?.canTweet || false;
};

// Get user's current stats
const getUserStats = async (userId: Types.ObjectId) => {
  const user = await User.findById(userId).select("totalViews totalSubscribers canTweet");
  return {
    totalViews: user?.totalViews || 0,
    totalSubscribers: user?.totalSubscribers || 0,
    canTweet: user?.canTweet || false,
  };
};

export const updateAllUsersTweetEligibility = async () => {
  const { User } = await import("@/db/models/user.model");

  const users = await User.find({}, "_id");
  const updatePromises = users.map(user => updateUserTweetEligibility(user._id));

  await Promise.all(updatePromises);
  return { message: `Updated tweet eligibility for ${users.length} users` };
};

export const userService = {
  updateUserTweetEligibility,
  canUserTweet,
  getUserStats,
  getUserTotalViews,
  getUserSubscriberCount,
  updateAllUsersTweetEligibility,
};

export default userService;
