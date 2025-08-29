import { Hono } from "hono";
import { z } from "zod/v4";

import authMiddleware from "@/middlewares/is-authmiddleware";
import { dashboardService } from "@/services/dashboard.service";
import type { UserProfile } from "@/utils/helper.utils";
import { sendSuccessResponse } from "@/utils/response.utils";
import { zCustomValidator } from "@/utils/zod-validator.utils";

const dashboardRouter = new Hono<{
  Variables: {
    user: UserProfile;
  };
}>();

// Apply authentication middleware to all dashboard routes
dashboardRouter.use(authMiddleware);

// Validation schemas
const getChannelVideosQuerySchema = z.object({
  page: z
    .string()
    .transform(val => parseInt(val))
    .optional(),
  limit: z
    .string()
    .transform(val => parseInt(val))
    .optional(),
  sortBy: z.enum(["createdAt", "views", "title"]).optional(),
  sortType: z.enum(["asc", "desc"]).optional(),
});

const limitParamSchema = z.object({
  limit: z
    .string()
    .transform(val => parseInt(val))
    .optional(),
});

// Get channel statistics
dashboardRouter.get("/stats", async c => {
  const { _id: userId } = c.get("user");
  const stats = await dashboardService.getChannelStats(userId);
  return sendSuccessResponse(c, stats, "Channel stats fetched successfully");
});

// Get channel videos with pagination and sorting
dashboardRouter.get("/videos", zCustomValidator("query", getChannelVideosQuerySchema), async c => {
  const { page, limit, sortBy, sortType } = c.req.valid("query");
  const { _id: userId } = c.get("user");

  const result = await dashboardService.getChannelVideos(userId, {
    page,
    limit,
    sortBy,
    sortType,
  });

  return sendSuccessResponse(c, result, "Channel videos fetched successfully");
});

// Get top performing videos
dashboardRouter.get("/top-videos", zCustomValidator("query", limitParamSchema), async c => {
  const { limit = 5 } = c.req.valid("query");
  const { _id: userId } = c.get("user");

  const topVideos = await dashboardService.getTopPerformingVideos(userId, limit);
  return sendSuccessResponse(c, topVideos, "Top performing videos fetched successfully");
});

// Get recent activity
dashboardRouter.get("/recent-activity", zCustomValidator("query", limitParamSchema), async c => {
  const { limit = 10 } = c.req.valid("query");
  const { _id: userId } = c.get("user");

  const activity = await dashboardService.getRecentActivity(userId, limit);
  return sendSuccessResponse(c, activity, "Recent activity fetched successfully");
});

// Get channel analytics overview (combines stats, top videos, and recent activity)
dashboardRouter.get("/analytics", async c => {
  const { _id: userId } = c.get("user");

  const [stats, topVideos, recentActivity] = await Promise.all([
    dashboardService.getChannelStats(userId),
    dashboardService.getTopPerformingVideos(userId, 5),
    dashboardService.getRecentActivity(userId, 10),
  ]);

  const analytics = {
    stats,
    topVideos,
    recentActivity,
  };

  return sendSuccessResponse(c, analytics, "Channel analytics fetched successfully");
});

// Validation schemas for new analytics routes
const engagementQuerySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]).optional(),
  days: z
    .string()
    .transform(val => parseInt(val))
    .optional(),
});

const audienceGrowthQuerySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]).optional(),
  days: z
    .string()
    .transform(val => parseInt(val))
    .optional(),
});

const contentPerformanceQuerySchema = z.object({
  dimension: z.enum(["time", "duration", "category"]).optional(),
});

const comparisonQuerySchema = z.object({
  period: z.enum(["week", "month", "quarter", "year"]).optional(),
});

// Get engagement analytics (views, likes, comments over time)
dashboardRouter.get("/engagement", zCustomValidator("query", engagementQuerySchema), async c => {
  const { period = "daily", days = 30 } = c.req.valid("query");
  const { _id: userId } = c.get("user");

  const engagementData = await dashboardService.getEngagementAnalytics(userId, period, days);
  return sendSuccessResponse(c, engagementData, "Engagement analytics fetched successfully");
});

// Get audience growth analytics
dashboardRouter.get(
  "/audience-growth",
  zCustomValidator("query", audienceGrowthQuerySchema),
  async c => {
    const { period = "daily", days = 30 } = c.req.valid("query");
    const { _id: userId } = c.get("user");

    const audienceData = await dashboardService.getAudienceGrowth(userId, period, days);
    return sendSuccessResponse(c, audienceData, "Audience growth analytics fetched successfully");
  }
);

// Get content performance analytics
dashboardRouter.get(
  "/content-performance",
  zCustomValidator("query", contentPerformanceQuerySchema),
  async c => {
    const { dimension = "time" } = c.req.valid("query");
    const { _id: userId } = c.get("user");

    const performanceData = await dashboardService.getContentPerformance(userId, dimension);
    return sendSuccessResponse(
      c,
      performanceData,
      "Content performance analytics fetched successfully"
    );
  }
);

// Get retention analytics
dashboardRouter.get("/retention", async c => {
  const { _id: userId } = c.get("user");

  const retentionData = await dashboardService.getRetentionAnalytics(userId);
  return sendSuccessResponse(c, retentionData, "Retention analytics fetched successfully");
});

// Get comparison analytics (period-over-period)
dashboardRouter.get("/compare", zCustomValidator("query", comparisonQuerySchema), async c => {
  const { period = "month" } = c.req.valid("query");
  const { _id: userId } = c.get("user");

  const comparisonData = await dashboardService.getComparisonAnalytics(userId, period);
  return sendSuccessResponse(c, comparisonData, "Comparison analytics fetched successfully");
});

export default dashboardRouter;
