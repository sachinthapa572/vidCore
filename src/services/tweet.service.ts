import type { PipelineStage, Types } from "mongoose";

import { Tweet } from "@/db/models/tweet.model";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { userService } from "@/services/user.service";
import { throwError } from "@/utils/api-error";
import type { createTweetInput, getUserTweetsQueryInput } from "@/validation/tweet.validation";

interface GetUserTweetsOptions extends getUserTweetsQueryInput {
  userId: Types.ObjectId;
  currentUserId?: Types.ObjectId;
}

export const createTweet = async (data: createTweetInput & { ownerId: Types.ObjectId }) => {
  const { content, ownerId } = data;

  if (!content) {
    throwError(HttpStatusCode.BAD_REQUEST, "Tweet content should not be empty");
  }

  const canTweet = await userService.canUserTweet(ownerId);

  if (!canTweet) {
    const userStats = await userService.getUserStats(ownerId);
    const MIN_VIEWS = 10000; // 10K views
    const MIN_SUBSCRIBERS = 5000; // 5K subscribers

    const errors = [];
    if (userStats.totalViews < MIN_VIEWS) {
      errors.push(`views: ${userStats.totalViews.toLocaleString()}/${MIN_VIEWS.toLocaleString()}`);
    }
    if (userStats.totalSubscribers < MIN_SUBSCRIBERS) {
      errors.push(
        `subscribers: ${userStats.totalSubscribers.toLocaleString()}/${MIN_SUBSCRIBERS.toLocaleString()}`
      );
    }

    throwError(
      HttpStatusCode.FORBIDDEN,
      `You need at least ${MIN_VIEWS.toLocaleString()} total video views and ${MIN_SUBSCRIBERS.toLocaleString()} subscribers to create tweets. Current: ${errors.join(", ")}`
    );
  }

  const tweet = await Tweet.create({
    content,
    owner: ownerId,
  });

  if (!tweet) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to create tweet");
  }

  return tweet;
};

export const getUserTweets = async (data: GetUserTweetsOptions) => {
  const { userId, page = 1, limit = 10, sort = "recent", currentUserId } = data;

  // Build match conditions
  const matchConditions: Record<string, unknown> = {
    owner: userId,
  };

  // Add user filter for "my_tweets" sort
  if (sort === "my_tweets" && currentUserId) {
    matchConditions.owner = currentUserId;
  }

  // Build aggregation pipeline
  const pipeline: PipelineStage[] = [
    { $match: matchConditions },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },
    {
      $project: {
        content: 1,
        owner: {
          $arrayElemAt: ["$ownerDetails", 0],
        },
        likesCount: 1,
        isPinned: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];

  // Add sorting based on the sort parameter
  let sortStage: PipelineStage.Sort = { $sort: { isPinned: -1, createdAt: -1 } };
  switch (sort) {
    case "recent":
      sortStage = { $sort: { isPinned: -1, createdAt: -1 } };
      break;
    case "oldest":
      sortStage = { $sort: { isPinned: -1, createdAt: 1 } };
      break;
    case "most_liked":
      sortStage = { $sort: { isPinned: -1, likesCount: -1, createdAt: -1 } };
      break;
    case "least_liked":
      sortStage = { $sort: { isPinned: -1, likesCount: 1, createdAt: -1 } };
      break;
    case "my_tweets":
      sortStage = { $sort: { isPinned: -1, createdAt: -1 } };
      break;
    default:
      sortStage = { $sort: { isPinned: -1, createdAt: -1 } };
  }

  pipeline.push(sortStage);
  pipeline.push({ $skip: (page - 1) * limit } as PipelineStage.Skip);
  pipeline.push({ $limit: limit } as PipelineStage.Limit);

  const tweets = await Tweet.aggregate(pipeline);

  if (!tweets?.length) {
    throwError(HttpStatusCode.NOT_FOUND, "Tweets not found");
  }

  return tweets;
};

export const updateTweet = async (data: {
  tweetId: Types.ObjectId;
  content: string;
  ownerId: Types.ObjectId;
}) => {
  const { tweetId, content, ownerId } = data;

  // First check if tweet exists and user owns it
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throwError(HttpStatusCode.NOT_FOUND, "Tweet not found");
    return;
  }

  if (!tweet?.isOwnedBy(ownerId)) {
    throwError(HttpStatusCode.FORBIDDEN, "You can only update your own tweets");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!updatedTweet) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to update tweet");
  }

  return updatedTweet;
};

export const deleteTweet = async (data: { tweetId: Types.ObjectId; ownerId: Types.ObjectId }) => {
  const { tweetId, ownerId } = data;

  // First check if tweet exists and user owns it
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throwError(HttpStatusCode.NOT_FOUND, "Tweet not found");
  }

  if (!tweet?.isOwnedBy(ownerId)) {
    throwError(HttpStatusCode.FORBIDDEN, "You can only delete your own tweets");
  }

  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

  if (!deletedTweet) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to delete tweet");
  }

  return deletedTweet;
};

export const pinTweet = async (data: {
  tweetId: Types.ObjectId;
  ownerId: Types.ObjectId;
  isPinned: boolean;
}) => {
  const { tweetId, ownerId, isPinned } = data;

  // Find the tweet
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throwError(HttpStatusCode.NOT_FOUND, "Tweet not found");
    return;
  }

  // Check if the user is the tweet owner
  if (!tweet.isOwnedBy(ownerId)) {
    throwError(HttpStatusCode.FORBIDDEN, "Only tweet owner can pin/unpin tweets");
    return;
  }

  // Update the tweet's pinned status
  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    { $set: { isPinned } },
    { new: true }
  ).populate("owner", "avatar.url avatarUrl username");

  if (!updatedTweet) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to update tweet pin status");
  }

  return updatedTweet;
};

export const tweetService = {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
  pinTweet,
};

export default tweetService;
