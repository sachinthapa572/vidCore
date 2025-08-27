import { Hono } from "hono";
import { z } from "zod";

import { agenda, JOB_TYPES } from "@/config/agenda";
import { Video } from "@/db/models/video.model";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { throwError } from "@/utils/api-error";
import { zCustomValidator } from "@/utils/zod-validator.utils";

const dashboard = new Hono();

// Validation schemas
const jobStatusEnum = ["all", "running", "scheduled", "completed", "failed"] as const;

const jobFilterSchema = z.object({
  status: z.enum(jobStatusEnum).optional(),
  type: z.string().optional(),
  limit: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => val > 0 && val <= 100)
    .optional(),
  skip: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => val >= 0)
    .optional(),
});

const jobIdSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
});

// Types
interface JobStats {
  total: number;
  running: number;
  scheduled: number;
  completed: number;
  failed: number;
  types: Record<string, number>;
}

interface JobSummary {
  _id: string;
  name: string;
  type: string;
  priority: string | number;
  nextRunAt: Date | null;
  lockedAt: Date | null;
  lastRunAt: Date | null;
  lastFinishedAt: Date | null;
  failedAt: Date | null;
  failCount: number;
  failReason: string | null;
  repeatInterval: string | null | undefined;
  repeatTimezone: string | null | undefined;
  data: Record<string, unknown>;
}

/**
 * GET /agenda-dashboard/stats
 * Get comprehensive job queue statistics
 */
dashboard.get("/stats", async c => {
  try {
    const [total, running, scheduled, completed, failed, jobsByType] = await Promise.all([
      agenda.jobs({}).then(jobs => jobs.length),
      agenda.jobs({ lockedAt: { $exists: true } }).then(jobs => jobs.length),
      agenda
        .jobs({ nextRunAt: { $gt: new Date() }, lockedAt: { $exists: false } })
        .then(jobs => jobs.length),
      agenda
        .jobs({ lastFinishedAt: { $exists: true }, failedAt: { $exists: false } })
        .then(jobs => jobs.length),
      agenda.jobs({ failedAt: { $exists: true } }).then(jobs => jobs.length),
      agenda.jobs({}).then(jobs => {
        const typeCount: Record<string, number> = {};
        jobs.forEach(job => {
          typeCount[job.attrs.name] = (typeCount[job.attrs.name] || 0) + 1;
        });
        return typeCount;
      }),
    ]);

    const stats: JobStats = {
      total,
      running,
      scheduled,
      completed,
      failed,
      types: jobsByType,
    };

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching job stats:", error);
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to fetch job statistics");
  }
});

/**
 * GET /agenda-dashboard/jobs
 * Get list of jobs with filtering and pagination
 */
dashboard.get("/jobs", zCustomValidator("query", jobFilterSchema), async c => {
  try {
    const { status = "all", type, limit = 20, skip = 0 } = c.req.valid("query");

    const query: Record<string, unknown> = {};

    // Apply status filter
    if (status === "running") {
      query.lockedAt = { $exists: true };
    } else if (status === "scheduled") {
      query.nextRunAt = { $gt: new Date() };
      query.lockedAt = { $exists: false };
    } else if (status === "completed") {
      query.lastFinishedAt = { $exists: true };
      query.failedAt = { $exists: false };
    } else if (status === "failed") {
      query.failedAt = { $exists: true };
    }

    // Apply type filter
    if (type) {
      query.name = type;
    }

    const jobs = await agenda.jobs(query, {}, limit, skip);

    const jobSummaries: JobSummary[] = jobs.map(job => ({
      _id: job.attrs._id.toString(),
      name: job.attrs.name,
      type: job.attrs.name,
      priority: job.attrs.priority,
      nextRunAt: job.attrs.nextRunAt || null,
      lockedAt: job.attrs.lockedAt || null,
      lastRunAt: job.attrs.lastRunAt || null,
      lastFinishedAt: job.attrs.lastFinishedAt || null,
      failedAt: job.attrs.failedAt || null,
      failCount: job.attrs.failCount || 0,
      failReason: job.attrs.failReason || null,
      repeatInterval: job.attrs.repeatInterval,
      repeatTimezone: job.attrs.repeatTimezone,
      data: job.attrs.data,
    }));

    return c.json({
      success: true,
      data: {
        jobs: jobSummaries,
        pagination: {
          limit,
          skip,
          hasMore: jobs.length === limit,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to fetch jobs");
  }
});

/**
 * GET /agenda-dashboard/jobs/:jobId
 * Get detailed information about a specific job
 */
dashboard.get("/jobs/:jobId", zCustomValidator("param", jobIdSchema), async c => {
  try {
    const { jobId } = c.req.valid("param");

    const jobs = await agenda.jobs({ _id: jobId });
    if (jobs.length === 0) {
      throwError(HttpStatusCode.NOT_FOUND, "Job not found");
    }

    const job = jobs[0];
    const jobDetails = {
      _id: job.attrs._id.toString(),
      name: job.attrs.name,
      type: job.attrs.name,
      priority: job.attrs.priority,
      nextRunAt: job.attrs.nextRunAt,
      lockedAt: job.attrs.lockedAt,
      lastRunAt: job.attrs.lastRunAt,
      lastFinishedAt: job.attrs.lastFinishedAt,
      failedAt: job.attrs.failedAt,
      failCount: job.attrs.failCount || 0,
      failReason: job.attrs.failReason || null,
      repeatInterval: job.attrs.repeatInterval,
      repeatTimezone: job.attrs.repeatTimezone,
      data: job.attrs.data,
      result: job.attrs.result,
      unique: job.attrs.unique,
      uniqueOpts: job.attrs.uniqueOpts,
      shouldSaveResult: job.attrs.shouldSaveResult,
      disabled: job.attrs.disabled || false,
    };

    return c.json({
      success: true,
      data: jobDetails,
    });
  } catch (error) {
    console.error("Error fetching job details:", error);
    if (error instanceof Error && error.message === "Job not found") {
      throw error;
    }
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to fetch job details");
  }
});

/**
 * POST /agenda-dashboard/jobs/:jobId/cancel
 * Cancel a scheduled job
 */
dashboard.post("/jobs/:jobId/cancel", zCustomValidator("param", jobIdSchema), async c => {
  try {
    const { jobId } = c.req.valid("param");

    const jobs = await agenda.jobs({ _id: jobId });
    if (jobs.length === 0) {
      throwError(HttpStatusCode.NOT_FOUND, "Job not found");
    }

    const job = jobs[0];
    await job.remove();

    return c.json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling job:", error);
    if (error instanceof Error && error.message === "Job not found") {
      throw error;
    }
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to cancel job");
  }
});

/**
 * POST /agenda-dashboard/jobs/:jobId/retry
 * Retry a failed job
 */
dashboard.post("/jobs/:jobId/retry", zCustomValidator("param", jobIdSchema), async c => {
  try {
    const { jobId } = c.req.valid("param");

    const jobs = await agenda.jobs({ _id: jobId });
    if (jobs.length === 0) {
      throwError(HttpStatusCode.NOT_FOUND, "Job not found");
    }

    const job = jobs[0];
    job.attrs.failCount = 0;
    job.attrs.failedAt = undefined;
    job.attrs.failReason = undefined;
    job.attrs.nextRunAt = new Date();

    await job.save();

    return c.json({
      success: true,
      message: "Job scheduled for retry",
    });
  } catch (error) {
    console.error("Error retrying job:", error);
    if (error instanceof Error && error.message === "Job not found") {
      throw error;
    }
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to retry job");
  }
});

/**
 * GET /agenda-dashboard/types
 * Get available job types
 */
dashboard.get("/types", async c => {
  try {
    const jobTypes = Object.values(JOB_TYPES);
    return c.json({
      success: true,
      data: jobTypes,
    });
  } catch (error) {
    console.error("Error fetching job types:", error);
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to fetch job types");
  }
});

/**
 * GET /agenda-dashboard/health
 * Health check for the job queue
 */
dashboard.get("/health", async c => {
  try {
    // Try to fetch jobs to check if Agenda.js is working
    const stats = await agenda.jobs({}).then(jobs => ({
      totalJobs: jobs.length,
      runningJobs: jobs.filter(job => job.attrs.lockedAt).length,
      failedJobs: jobs.filter(job => job.attrs.failedAt).length,
    }));

    return c.json({
      success: true,
      data: {
        status: "healthy",
        connected: true,
        stats,
      },
    });
  } catch (error) {
    console.error("Error checking health:", error);
    return c.json(
      {
        success: false,
        data: {
          status: "unhealthy",
          connected: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
      HttpStatusCode.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * GET /agenda-dashboard/videos/stats
 * Get video-specific statistics including soft delete info
 */
dashboard.get("/videos/stats", async c => {
  try {
    const [totalVideos, activeVideos, softDeletedVideos, hardDeleteJobs] = await Promise.all([
      Video.countDocuments({}),
      Video.countDocuments({ isDeleted: { $ne: true } }),
      Video.countDocuments({ isDeleted: true }),
      agenda.jobs({ name: JOB_TYPES.HARD_DELETE_VIDEO }).then(jobs => jobs.length),
    ]);

    const stats = {
      totalVideos,
      activeVideos,
      softDeletedVideos,
      hardDeleteJobs,
      recoveryWindowDays: 7,
    };

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching video stats:", error);
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to fetch video statistics");
  }
});

/**
 * GET /agenda-dashboard/videos/deleted
 * Get list of soft deleted videos available for recovery
 */
dashboard.get("/videos/deleted", async c => {
  try {
    const deletedVideos = await Video.find({ isDeleted: true })
      .select("title description deletedAt hardDeleteJobId createdAt")
      .sort({ deletedAt: -1 })
      .lean();

    const videosWithRecoveryInfo = deletedVideos.map(video => {
      const deletedAt = video.deletedAt ? new Date(video.deletedAt) : null;
      const now = new Date();
      const daysSinceDeletion = deletedAt
        ? Math.floor((now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const daysLeft = Math.max(0, 7 - daysSinceDeletion);

      return {
        _id: video._id,
        title: video.title,
        description: video.description,
        deletedAt: video.deletedAt,
        hardDeleteJobId: video.hardDeleteJobId,
        daysSinceDeletion,
        daysLeft,
        canRecover: daysLeft > 0,
      };
    });

    return c.json({
      success: true,
      data: videosWithRecoveryInfo,
    });
  } catch (error) {
    console.error("Error fetching deleted videos:", error);
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to fetch deleted videos");
  }
});

/**
 * POST /agenda-dashboard/videos/:videoId/recover
 * Recover a soft deleted video
 */
dashboard.post("/videos/:jobId/recover", zCustomValidator("param", jobIdSchema), async c => {
  try {
    const { jobId: videoId } = c.req.valid("param");

    // Check if video exists and is soft deleted
    const video = await Video.findById(videoId);
    if (!video) {
      throwError(HttpStatusCode.NOT_FOUND, "Video not found");
      return;
    }

    if (!video.isDeleted) {
      throwError(HttpStatusCode.BAD_REQUEST, "Video is not soft deleted");
      return;
    }

    // Check if recovery window has expired
    if (video.deletedAt) {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const now = new Date();
      const deletedTime = new Date(video.deletedAt);
      const timeDiff = now.getTime() - deletedTime.getTime();

      if (timeDiff > sevenDaysMs) {
        throwError(HttpStatusCode.BAD_REQUEST, "Recovery window has expired");
        return;
      }
    }

    // Cancel the scheduled hard delete job if it exists
    if (video.hardDeleteJobId) {
      try {
        await agenda.cancel({ _id: video.hardDeleteJobId });
      } catch (cancelError) {
        console.warn(`Failed to cancel hard delete job ${video.hardDeleteJobId}:`, cancelError);
      }
    }

    // Recover the video
    await Video.findByIdAndUpdate(videoId, {
      isDeleted: false,
      deletedAt: null,
      hardDeleteJobId: null,
    });

    return c.json({
      success: true,
      message: "Video recovered successfully",
      data: {
        videoId: videoId,
        title: video.title,
      },
    });
  } catch (error) {
    console.error("Error recovering video:", error);
    if (error instanceof Error && error.message === "Video not found") {
      throw error;
    }
    if (error instanceof Error && error.message === "Video is not soft deleted") {
      throw error;
    }
    if (error instanceof Error && error.message === "Recovery window has expired") {
      throw error;
    }
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to recover video");
  }
});

/**
 * POST /agenda-dashboard/videos/:videoId/force-delete
 * Force delete a video immediately (admin function)
 */
dashboard.post("/videos/:jobId/force-delete", zCustomValidator("param", jobIdSchema), async c => {
  try {
    const { jobId: videoId } = c.req.valid("param");

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      throwError(HttpStatusCode.NOT_FOUND, "Video not found");
      return;
    }

    // Cancel any scheduled hard delete job
    if (video.hardDeleteJobId) {
      try {
        await agenda.cancel({ _id: video.hardDeleteJobId });
      } catch (cancelError) {
        console.warn(`Failed to cancel hard delete job ${video.hardDeleteJobId}:`, cancelError);
      }
    }

    // Schedule immediate hard delete
    const hardDeleteJobData = {
      videoId,
      videoPublicId: video.videoFile?.publicId,
      thumbnailPublicId: video.thumbnail?.publicId,
    };

    const hardDeleteJob = await agenda.schedule(
      "now",
      JOB_TYPES.HARD_DELETE_VIDEO,
      hardDeleteJobData
    );

    return c.json({
      success: true,
      message: "Video scheduled for immediate deletion",
      data: {
        videoId: videoId,
        jobId: hardDeleteJob.attrs._id.toString(),
        title: video.title,
      },
    });
  } catch (error) {
    console.error("Error force deleting video:", error);
    if (error instanceof Error && error.message === "Video not found") {
      throw error;
    }
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to force delete video");
  }
});

export default dashboard;
