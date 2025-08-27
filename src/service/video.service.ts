import type { Types } from "mongoose";

import {
  agenda,
  JOB_TYPES,
  type RecoverVideoJobData,
  type SoftDeleteVideoJobData,
  type UpdateVideoJobData,
  type VideoJobData,
} from "@/config/agenda";
import { Video } from "@/db/models/video.model";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { throwError } from "@/utils/api-error";
import type { SortByEnum, SortTypeEnum, videoValidationInput } from "@/validation/video.validation";

interface PaginationOptions {
  page?: number;
  limit?: number;
  query?: string;
  sortBy?: SortByEnum;
  sortType?: SortTypeEnum;
  userId?: Types.ObjectId;
}

export const getAllVideos = async (data: PaginationOptions) => {
  const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = data;

  const match = {
    isDeleted: { $ne: true }, // Exclude soft deleted videos
    ...(query && { title: { $regex: query, $options: "i" } }),
    ...(userId && { owner: userId }),
  };

  const videos = await Video.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "videosByOwner",
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
        jobId: 1,
        errorMessage: 1,
        retryCount: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: {
          $arrayElemAt: ["$videosByOwner", 0],
        },
      },
    },
    {
      $sort: {
        [String(sortBy)]: sortType === "asc" ? 1 : -1,
      },
    },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);

  if (!videos?.length) {
    throwError(HttpStatusCode.NOT_FOUND, "Videos not found");
  }
  return videos;
};

export const publishVideo = async (data: videoValidationInput & { owner: Types.ObjectId }) => {
  const videoDoc = new Video({
    title: data.title,
    description: data.description,
    owner: data.owner,
    uploadStatus: "pending",
    retryCount: 0,
  });
  await videoDoc.save({ validateBeforeSave: false });

  if (!videoDoc) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to create video record");
  }

  // Submit job to agenda queue
  const jobData: VideoJobData = {
    videoId: (videoDoc._id as Types.ObjectId).toString(),
    videoFile: data.videoFile,
    thumbnail: data.thumbnail,
    title: data.title,
    description: data.description,
    owner: data.owner,
  };

  const job = await agenda.schedule("now", JOB_TYPES.PROCESS_VIDEO, jobData);

  console.log(`Video upload job scheduled with ID: ${job.attrs._id}`);

  return {
    videoId: (videoDoc._id as Types.ObjectId).toString(),
    jobId: job.attrs._id.toString(),
    title: videoDoc.title,
    description: videoDoc.description,
    uploadStatus: videoDoc.uploadStatus,
    owner: videoDoc.owner,
    message: "Video upload has been queued for processing",
  };
};

export const getVideoById = async (videoId: string) => {
  const video = await Video.findById(videoId)
    .populate<{ owner: { name: string; email: string } }>("owner", "name email")
    .lean();
  if (!video) {
    throwError(HttpStatusCode.NOT_FOUND, "Video not found");
  }
  return video;
};

export const getVideoStatus = async (videoId: string) => {
  const video = await Video.findById(videoId).select(
    "uploadStatus jobId errorMessage retryCount title description createdAt updatedAt"
  );

  if (!video) {
    throwError(HttpStatusCode.NOT_FOUND, "Video not found");
    return;
  }

  return {
    videoId: video._id,
    title: video.title,
    description: video.description,
    uploadStatus: video.uploadStatus,
    jobId: video.jobId,
    errorMessage: video.errorMessage,
    retryCount: video.retryCount,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
};

export const updateVideo = async (data: Partial<videoValidationInput> & { videoId: string }) => {
  const { videoId, title, description, thumbnail, videoFile } = data;

  // Check if video exists
  const video = await Video.findById(videoId);
  if (!video) {
    throwError(HttpStatusCode.NOT_FOUND, "Video not found");
    return;
  }

  // Schedule update job
  const jobData: UpdateVideoJobData = {
    videoId,
    title,
    description,
    thumbnail,
    videoFile,
  };

  const job = await agenda.schedule("now", JOB_TYPES.UPDATE_VIDEO, jobData);

  console.log(`Video update job scheduled with ID: ${job.attrs._id}`);

  // Return immediate response with job tracking info
  return {
    videoId: (video._id as Types.ObjectId).toString(),
    jobId: job.attrs._id.toString(),
    title: video.title,
    description: video.description,
    uploadStatus: "updating",
    message: "Video update has been queued for processing",
  };
};

export const deleteVideo = async (videoId: string) => {
  // Check if video exists
  const video = await Video.findById(videoId);
  if (!video) {
    throwError(HttpStatusCode.NOT_FOUND, "Video not found");
    return;
  }

  // Check if already soft deleted
  if (video.isDeleted) {
    throwError(HttpStatusCode.BAD_REQUEST, "Video is already marked for deletion");
    return;
  }

  // Schedule soft delete job (immediate)
  const softDeleteJobData: SoftDeleteVideoJobData = {
    videoId,
  };

  const softDeleteJob = await agenda.schedule(
    "now",
    JOB_TYPES.SOFT_DELETE_VIDEO,
    softDeleteJobData
  );

  console.log(`Video soft delete job scheduled with ID: ${softDeleteJob.attrs._id}`);

  // Return immediate response with job tracking info
  return {
    videoId: (video._id as Types.ObjectId).toString(),
    jobId: softDeleteJob.attrs._id.toString(),
    title: video.title,
    uploadStatus: "deleting",
    message: "Video deletion has been queued for processing",
  };
};

export const recoverVideo = async (videoId: string) => {
  // Check if video exists
  const video = await Video.findById(videoId);
  if (!video) {
    throwError(HttpStatusCode.NOT_FOUND, "Video not found");
    return;
  }

  // Check if video is soft deleted
  if (!video.isDeleted) {
    throwError(HttpStatusCode.BAD_REQUEST, "Video is not marked for deletion");
    return;
  }

  // Check if 7-day window has expired
  if (video.deletedAt) {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const deletedTime = new Date(video.deletedAt);
    const timeDiff = now.getTime() - deletedTime.getTime();

    if (timeDiff > sevenDaysMs) {
      throwError(
        HttpStatusCode.BAD_REQUEST,
        "Recovery window has expired. Video has been permanently deleted."
      );
      return;
    }
  }

  // Schedule recovery job
  const recoverJobData: RecoverVideoJobData = {
    videoId,
  };

  const recoverJob = await agenda.schedule("now", JOB_TYPES.RECOVER_VIDEO, recoverJobData);

  console.log(`Video recovery job scheduled with ID: ${recoverJob.attrs._id}`);

  // Return immediate response with job tracking info
  return {
    videoId: (video._id as Types.ObjectId).toString(),
    jobId: recoverJob.attrs._id.toString(),
    title: video.title,
    uploadStatus: "recovering",
    message: "Video recovery has been queued for processing",
  };
};

export const togglePublishStatus = async (videoId: string) => {
  const video = await Video.findById(videoId);
  if (!video) {
    throwError(HttpStatusCode.NOT_FOUND, "Video not found");
    return null;
  }

  video.isPublished = !video.isPublished;
  await video.save();
  return video;
};

export const cancelSoftDelete = async (videoId: string) => {
  // Check if video exists
  const video = await Video.findById(videoId);
  if (!video) {
    throwError(HttpStatusCode.NOT_FOUND, "Video not found");
    return;
  }

  // Check if video is already soft deleted
  if (video.isDeleted) {
    throwError(HttpStatusCode.BAD_REQUEST, "Video is already soft deleted. Use recover endpoint instead.");
    return;
  }

  // Find and cancel any scheduled soft delete jobs for this video
  try {
    const jobs = await agenda.jobs({
      name: JOB_TYPES.SOFT_DELETE_VIDEO,
      "data.videoId": videoId
    });

    if (jobs.length === 0) {
      throwError(HttpStatusCode.BAD_REQUEST, "No scheduled soft delete job found for this video");
      return;
    }

    // Cancel all matching jobs
    const cancelPromises = jobs.map(job => agenda.cancel({ _id: job.attrs._id }));
    await Promise.all(cancelPromises);

    console.log(`Cancelled ${jobs.length} soft delete job(s) for video ${videoId}`);

    // Return immediate response
    return {
      videoId: (video._id as Types.ObjectId).toString(),
      title: video.title,
      description: video.description,
      uploadStatus: video.uploadStatus,
      message: "Soft delete cancelled successfully",
    };
  } catch (error) {
    console.error(`Failed to cancel soft delete for video ${videoId}:`, error);
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to cancel soft delete");
  }
};

export const videoService = {
  getAllVideos,
  publishVideo,
  getVideoById,
  getVideoStatus,
  updateVideo,
  deleteVideo,
  recoverVideo,
  togglePublishStatus,
  cancelSoftDelete,
};

export default videoService;
