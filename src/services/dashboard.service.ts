import type { Types } from "mongoose";

import { Comment } from "@/db/models/comment.model";
import { Like } from "@/db/models/like.model";
import { Subscription } from "@/db/models/subscription.model";
import { Tweet } from "@/db/models/tweet.model";
import { Video } from "@/db/models/video.model";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { throwError } from "@/utils/api-error";

export interface ChannelStats {
  totalVideos: number;
  totalSubscribers: number;
  totalVideoLikes: number;
  totalTweetLikes: number;
  totalCommentLikes: number;
  totalViews: number;
}

export interface ChannelVideosOptions {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "views" | "title";
  sortType?: "asc" | "desc";
}

export const getChannelStats = async (userId: Types.ObjectId): Promise<ChannelStats> => {
  // Fetch Total Videos Count
  const totalVideos = await Video.countDocuments({
    owner: userId,
    isDeleted: { $ne: true },
  });

  // Fetch Total Subscribers Count
  const totalSubscribers = await Subscription.countDocuments({
    channel: userId,
  });

  // Count Total Likes Across All Videos Owned by the User
  const totalVideoLikes = await Like.countDocuments({
    video: {
      $in: await Video.find({ owner: userId, isDeleted: { $ne: true } }).distinct("_id"),
    },
  });

  // Total Likes on Tweets
  const totalTweetLikes = await Like.countDocuments({
    tweet: {
      $in: await Tweet.find({ owner: userId }).distinct("_id"),
    },
  });

  // Total Likes on Comments
  const totalCommentLikes = await Like.countDocuments({
    comment: {
      $in: await Comment.find({ owner: userId }).distinct("_id"),
    },
  });

  // Summing Up Total Views for All Videos Owned by the User
  const totalViewsAggregation = await Video.aggregate([
    {
      $match: {
        owner: userId,
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  const totalViews = totalViewsAggregation[0]?.totalViews || 0;

  return {
    totalVideos,
    totalSubscribers,
    totalVideoLikes,
    totalTweetLikes,
    totalCommentLikes,
    totalViews,
  };
};

export const getChannelVideos = async (
  userId: Types.ObjectId,
  options: ChannelVideosOptions = {}
) => {
  const { page = 1, limit = 10, sortBy = "createdAt", sortType = "desc" } = options;

  const match = {
    owner: userId,
    isDeleted: { $ne: true }, // Exclude soft deleted videos
  };

  const videos = await Video.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        uploadStatus: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: {
          $arrayElemAt: ["$ownerDetails", 0],
        },
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);

  if (!videos?.length && page === 1) {
    throwError(HttpStatusCode.NOT_FOUND, "No videos found for this channel");
  }

  // Get total count for pagination
  const totalCount = await Video.countDocuments(match);

  return {
    videos,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1,
    },
  };
};

export const getTopPerformingVideos = async (userId: Types.ObjectId, limit: number = 5) => {
  const videos = await Video.find({
    owner: userId,
    isDeleted: { $ne: true },
    isPublished: true,
  })
    .sort({ views: -1 })
    .limit(limit)
    .populate("owner", "name email")
    .select("title views thumbnail createdAt duration");

  return videos;
};

export const getRecentActivity = async (userId: Types.ObjectId, limit: number = 10) => {
  const halfLimit = Math.floor(limit / 2);

  // Get recent videos
  const recentVideos = await Video.find({
    owner: userId,
    isDeleted: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .limit(halfLimit)
    .select("title createdAt uploadStatus");

  // Get recent likes on user's content
  const recentLikes = await Like.find({
    $or: [
      { video: { $in: await Video.find({ owner: userId }).distinct("_id") } },
      { tweet: { $in: await Tweet.find({ owner: userId }).distinct("_id") } },
      { comment: { $in: await Comment.find({ owner: userId }).distinct("_id") } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(halfLimit)
    .populate("likedBy", "name")
    .populate("video", "title")
    .populate("tweet", "content")
    .populate("comment", "content");

  return {
    recentVideos,
    recentLikes,
  };
};

// New Analytics Methods

export interface EngagementMetrics {
  period: string;
  date: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
}

export const getEngagementAnalytics = async (
  userId: Types.ObjectId,
  period: "daily" | "weekly" | "monthly" = "daily",
  days: number = 30
): Promise<EngagementMetrics[]> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  let groupBy: { $dateToString: { format: string; date: string } } | { $hour: string };
  let dateFormat: string;

  switch (period) {
    case "daily":
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      dateFormat = "%Y-%m-%d";
      break;
    case "weekly":
      groupBy = { $dateToString: { format: "%Y-%U", date: "$createdAt" } };
      dateFormat = "%Y-%U";
      break;
    case "monthly":
      groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
      dateFormat = "%Y-%m";
      break;
  }

  // Get video engagement data
  const videoEngagement = await Video.aggregate([
    {
      $match: {
        owner: userId,
        isDeleted: { $ne: true },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: groupBy,
        views: { $sum: "$views" },
        videoCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get likes data
  const likesData = await Like.aggregate([
    {
      $match: {
        video: { $in: await Video.find({ owner: userId }).distinct("_id") },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
        likes: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get comments data
  const commentsData = await Comment.aggregate([
    {
      $match: {
        video: { $in: await Video.find({ owner: userId }).distinct("_id") },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
        comments: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Combine all data
  const combinedData: { [key: string]: EngagementMetrics } = {};

  // Initialize with video data
  videoEngagement.forEach(item => {
    combinedData[item._id] = {
      period,
      date: item._id,
      views: item.views,
      likes: 0,
      comments: 0,
      engagementRate: 0,
    };
  });

  // Add likes data
  likesData.forEach(item => {
    if (combinedData[item._id]) {
      combinedData[item._id].likes = item.likes;
    } else {
      combinedData[item._id] = {
        period,
        date: item._id,
        views: 0,
        likes: item.likes,
        comments: 0,
        engagementRate: 0,
      };
    }
  });

  // Add comments data
  commentsData.forEach(item => {
    if (combinedData[item._id]) {
      combinedData[item._id].comments = item.comments;
    } else {
      combinedData[item._id] = {
        period,
        date: item._id,
        views: 0,
        likes: 0,
        comments: item.comments,
        engagementRate: 0,
      };
    }
  });

  // Calculate engagement rates
  Object.values(combinedData).forEach(item => {
    if (item.views > 0) {
      item.engagementRate = ((item.likes + item.comments) / item.views) * 100;
    }
  });

  return Object.values(combinedData).sort((a, b) => a.date.localeCompare(b.date));
};

export interface AudienceGrowth {
  period: string;
  date: string;
  newSubscribers: number;
  totalSubscribers: number;
  growthRate: number;
}

export const getAudienceGrowth = async (
  userId: Types.ObjectId,
  period: "daily" | "weekly" | "monthly" = "daily",
  days: number = 30
): Promise<AudienceGrowth[]> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  let dateFormat: string;
  switch (period) {
    case "daily":
      dateFormat = "%Y-%m-%d";
      break;
    case "weekly":
      dateFormat = "%Y-%U";
      break;
    case "monthly":
      dateFormat = "%Y-%m";
      break;
  }

  const subscriberData = await Subscription.aggregate([
    {
      $match: {
        channel: userId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
        newSubscribers: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Calculate running total and growth rate
  let runningTotal = await Subscription.countDocuments({
    channel: userId,
    createdAt: { $lt: startDate },
  });

  const result: AudienceGrowth[] = [];
  subscriberData.forEach(item => {
    const previousTotal = runningTotal;
    runningTotal += item.newSubscribers;

    const growthRate =
      previousTotal > 0 ? ((runningTotal - previousTotal) / previousTotal) * 100 : 0;

    result.push({
      period,
      date: item._id,
      newSubscribers: item.newSubscribers,
      totalSubscribers: runningTotal,
      growthRate: Number(growthRate.toFixed(2)),
    });
  });

  return result;
};

export interface ContentPerformance {
  dimension: "time" | "duration" | "category";
  metrics: {
    label: string;
    averageViews: number;
    averageEngagement: number;
    totalVideos: number;
  }[];
}

export const getContentPerformance = async (
  userId: Types.ObjectId,
  dimension: "time" | "duration" | "category" = "time"
): Promise<ContentPerformance> => {
  let groupBy:
    | { $hour: string }
    | { $switch: { branches: { case: Record<string, unknown>; then: string }[]; default: string } };

  switch (dimension) {
    case "time":
      groupBy = { $hour: "$createdAt" };
      break;
    case "duration":
      // Group by duration ranges (short: <5min, medium: 5-20min, long: >20min)
      groupBy = {
        $switch: {
          branches: [
            // biome-ignore lint/suspicious/noThenProperty: Valid MongoDB aggregation syntax
            { case: { $lt: ["$duration", 300] }, then: "short" },
            {
              case: { $and: [{ $gte: ["$duration", 300] }, { $lt: ["$duration", 1200] }] },
              // biome-ignore lint/suspicious/noThenProperty: Valid MongoDB aggregation syntax
              then: "medium",
            },
          ],
          default: "long",
        },
      };
      break;
    case "category":
      groupBy = {
        $switch: {
          branches: [
            {
              case: {
                $regexMatch: { input: { $toLower: "$title" }, regex: "tutorial|howto|guide" },
              },
              // biome-ignore lint/suspicious/noThenProperty: Valid MongoDB aggregation syntax
              then: "educational",
            },
            {
              case: { $regexMatch: { input: { $toLower: "$title" }, regex: "review|unboxing" } },
              // biome-ignore lint/suspicious/noThenProperty: Valid MongoDB aggregation syntax
              then: "review",
            },
            {
              case: { $regexMatch: { input: { $toLower: "$title" }, regex: "vlog|daily|life" } },
              // biome-ignore lint/suspicious/noThenProperty: Valid MongoDB aggregation syntax
              then: "vlog",
            },
          ],
          default: "other",
        },
      };
      break;
  }

  const performanceData = await Video.aggregate([
    {
      $match: {
        owner: userId,
        isDeleted: { $ne: true },
        isPublished: true,
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likes" },
        commentCount: { $size: "$comments" },
        engagement: { $add: [{ $size: "$likes" }, { $size: "$comments" }] },
      },
    },
    {
      $group: {
        _id: groupBy,
        totalViews: { $sum: "$views" },
        totalEngagement: { $sum: "$engagement" },
        totalVideos: { $sum: 1 },
        averageViews: { $avg: "$views" },
        averageEngagement: { $avg: "$engagement" },
      },
    },
    {
      $project: {
        label: "$_id",
        averageViews: { $round: ["$averageViews", 1] },
        averageEngagement: { $round: ["$averageEngagement", 1] },
        totalVideos: 1,
      },
    },
    { $sort: { totalVideos: -1 } },
  ]);

  return {
    dimension,
    metrics: performanceData,
  };
};

export interface RetentionMetrics {
  averageViewDuration: number;
  completionRate: number;
  returnVisitorRate: number;
  dropOffPoints: {
    timestamp: number;
    dropOffPercentage: number;
  }[];
}

export const getRetentionAnalytics = async (userId: Types.ObjectId): Promise<RetentionMetrics> => {
  // For now, we'll use basic retention metrics
  // In a real implementation, you'd need view duration tracking

  const videos = await Video.find({
    owner: userId,
    isDeleted: { $ne: true },
    isPublished: true,
  }).select("views duration");

  if (!videos.length) {
    return {
      averageViewDuration: 0,
      completionRate: 0,
      returnVisitorRate: 0,
      dropOffPoints: [],
    };
  }

  // Calculate basic metrics
  const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
  const averageDuration =
    videos.reduce((sum, video) => sum + (video.duration || 0), 0) / videos.length;

  // Estimate completion rate (simplified)
  const completionRate = Math.min((averageDuration / 300) * 100, 100); // Assuming 5min average

  // Estimate return visitor rate (simplified)
  const returnVisitorRate = Math.min((totalViews / videos.length) * 10, 100);

  // Generate sample drop-off points
  const dropOffPoints = [
    { timestamp: 30, dropOffPercentage: 20 },
    { timestamp: 60, dropOffPercentage: 35 },
    { timestamp: 120, dropOffPercentage: 50 },
    { timestamp: 180, dropOffPercentage: 65 },
    { timestamp: 240, dropOffPercentage: 75 },
    { timestamp: 300, dropOffPercentage: 85 },
  ];

  return {
    averageViewDuration: Math.round(averageDuration),
    completionRate: Math.round(completionRate),
    returnVisitorRate: Math.round(returnVisitorRate),
    dropOffPoints,
  };
};

export interface ComparisonData {
  currentPeriod: ChannelStats;
  previousPeriod: ChannelStats;
  growth: {
    videos: number;
    subscribers: number;
    views: number;
    engagement: number;
  };
}

export const getComparisonAnalytics = async (
  userId: Types.ObjectId,
  period: "week" | "month" | "quarter" | "year" = "month"
): Promise<ComparisonData> => {
  const now = new Date();
  let currentStart: Date, previousStart: Date, previousEnd: Date;

  switch (period) {
    case "week":
      currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), 1);
      break;
    case "quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      previousEnd = new Date(currentStart.getTime() - 1);
      const previousQuarter = Math.floor(previousEnd.getMonth() / 3);
      previousStart = new Date(previousEnd.getFullYear(), previousQuarter * 3, 1);
      break;
    }
    case "year":
      currentStart = new Date(now.getFullYear(), 0, 1);
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getFullYear(), 0, 1);
      break;
  }

  // Get current period stats
  const currentPeriod = await getChannelStatsForPeriod(userId, currentStart, now);

  // Get previous period stats
  const previousPeriod = await getChannelStatsForPeriod(userId, previousStart, previousEnd);

  // Calculate growth
  const growth = {
    videos: calculateGrowth(currentPeriod.totalVideos, previousPeriod.totalVideos),
    subscribers: calculateGrowth(currentPeriod.totalSubscribers, previousPeriod.totalSubscribers),
    views: calculateGrowth(currentPeriod.totalViews, previousPeriod.totalViews),
    engagement: calculateGrowth(
      currentPeriod.totalVideoLikes +
        currentPeriod.totalTweetLikes +
        currentPeriod.totalCommentLikes,
      previousPeriod.totalVideoLikes +
        previousPeriod.totalTweetLikes +
        previousPeriod.totalCommentLikes
    ),
  };

  return {
    currentPeriod,
    previousPeriod,
    growth,
  };
};

// Helper function to get channel stats for a specific period
const getChannelStatsForPeriod = async (
  userId: Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<ChannelStats> => {
  const totalVideos = await Video.countDocuments({
    owner: userId,
    isDeleted: { $ne: true },
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const totalSubscribers = await Subscription.countDocuments({
    channel: userId,
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const videoIds = await Video.find({
    owner: userId,
    isDeleted: { $ne: true },
    createdAt: { $gte: startDate, $lte: endDate },
  }).distinct("_id");

  const totalVideoLikes = await Like.countDocuments({
    video: { $in: videoIds },
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const tweetIds = await Tweet.find({
    owner: userId,
    createdAt: { $gte: startDate, $lte: endDate },
  }).distinct("_id");
  const totalTweetLikes = await Like.countDocuments({
    tweet: { $in: tweetIds },
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const commentIds = await Comment.find({
    owner: userId,
    createdAt: { $gte: startDate, $lte: endDate },
  }).distinct("_id");
  const totalCommentLikes = await Like.countDocuments({
    comment: { $in: commentIds },
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const totalViewsAggregation = await Video.aggregate([
    {
      $match: {
        owner: userId,
        isDeleted: { $ne: true },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  const totalViews = totalViewsAggregation[0]?.totalViews || 0;

  return {
    totalVideos,
    totalSubscribers,
    totalVideoLikes,
    totalTweetLikes,
    totalCommentLikes,
    totalViews,
  };
};

// Helper function to calculate growth percentage
const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
};

export const dashboardService = {
  getChannelStats,
  getChannelVideos,
  getTopPerformingVideos,
  getRecentActivity,
  getEngagementAnalytics,
  getAudienceGrowth,
  getContentPerformance,
  getRetentionAnalytics,
  getComparisonAnalytics,
};

export default dashboardService;
