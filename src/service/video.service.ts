import ffmpeg from "fluent-ffmpeg";
import { Types } from "mongoose";

import { storageConfig } from "@/config/storage.config";
import { Video } from "@/db/models/video.model";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { createStorage } from "@/services/storage/storage.factory";
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

/* Utility: get video duration */
export const getVideoDuration = async (videoPath: string): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error("Error extracting video duration"));
      } else {
        const rawDuration = metadata?.format?.duration;
        const durationNumber = typeof rawDuration === "number" ? rawDuration : Number(rawDuration);
        if (Number.isFinite(durationNumber)) {
          resolve(durationNumber);
        } else {
          resolve(0);
        }
      }
    });
  });
};

export const getAllVideos = async (data: PaginationOptions) => {
  const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = data;

  const match = {
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

  if (videos?.length) {
    throwError(HttpStatusCode.NOT_FOUND, "Videos not found");
  }
  return videos;
};

export const publishVideo = async (data: videoValidationInput) => {
  const videoStorage = createStorage(storageConfig.videoStorage);
  const thumbnailStorage = createStorage(storageConfig.thumbnailStorage);

  const [videoUpload, thumbnailUpload] = await Promise.all([
    videoStorage.uploadFile(data.videoFile, "videos"),
    thumbnailStorage.uploadFile(data.thumbnail, "thumbnails"),
  ]);

  const duration = await getVideoDuration(videoUpload.url);

  console.log("Video duration:", data.videoFile.size);

  const videoDocs = await Video.create({
    videoFile: {
      url: videoUpload.url,
      publicId: videoUpload.publicId,
    },
    thumbnail: {
      url: thumbnailUpload.url,
      publicId: thumbnailUpload.publicId,
    },
    title: data.title,
    description: data.description,
    owner: new Types.ObjectId(data.owner),
    duration: duration,
  });

  if (!videoDocs) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to create video");
  }

  return {
    thumbnail: {
      url: videoDocs.thumbnail.url,
      publicId: videoDocs.thumbnail.publicId,
    },
    title: videoDocs.title,
    description: videoDocs.description,
    duration: videoDocs.duration,
    views: videoDocs.views,
    isPublished: videoDocs.isPublished,
    owner: videoDocs.owner,
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

export const updateVideo = async (data: Partial<videoValidationInput> & { videoId: string }) => {
  const { videoId, title, description, thumbnail, videoFile } = data;

  const video = await Video.findById(videoId);
  if (!video) {
    throwError(HttpStatusCode.NOT_FOUND, "Video not found");
    return;
  }

  const updatedFields: {
    title?: string;
    description?: string;
    videoFile?: { url: string; publicId: string };
    thumbnail?: { url: string; publicId: string };
    duration?: number;
  } = {};

  if (title) updatedFields.title = title;
  if (description) updatedFields.description = description;

  let newVideoUpload: { url: string; publicId: string } | undefined;
  let newThumbnailUpload: { url: string; publicId: string } | undefined;

  try {
    if (videoFile) {
      const videoStorage = createStorage(storageConfig.videoStorage);
      newVideoUpload = await videoStorage.uploadFile(videoFile, "videos");
      updatedFields.videoFile = newVideoUpload;
      updatedFields.duration = await getVideoDuration(newVideoUpload.url);
    }
    if (thumbnail) {
      const thumbnailStorage = createStorage(storageConfig.thumbnailStorage);
      newThumbnailUpload = await thumbnailStorage.uploadFile(thumbnail, "thumbnails");
      updatedFields.thumbnail = newThumbnailUpload;
    }

    if (Object.keys(updatedFields).length === 0) {
      return video;
    }

    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    if (!updatedVideo) {
      throwError(
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        "Failed to update video in the database. Please try again."
      );
      return;
    }

    const deletePromises: Promise<void>[] = [];
    if (newVideoUpload && video.videoFile?.publicId) {
      const videoStorage = createStorage(storageConfig.videoStorage);
      deletePromises.push(videoStorage.deleteFile(video.videoFile.publicId));
    }
    if (newThumbnailUpload && video.thumbnail?.publicId) {
      const thumbnailStorage = createStorage(storageConfig.thumbnailStorage);
      deletePromises.push(thumbnailStorage.deleteFile(video.thumbnail.publicId));
    }

    if (deletePromises.length > 0) {
      const deleteResults = await Promise.allSettled(deletePromises);
      deleteResults.forEach(result => {
        if (result.status === "rejected") {
          console.error("Failed to delete old file after update:", result.reason);
        }
      });
    }

    return updatedVideo;
  } catch (error) {
    const cleanupPromises: Promise<void>[] = [];
    if (newVideoUpload) {
      const videoStorage = createStorage(storageConfig.videoStorage);
      cleanupPromises.push(videoStorage.deleteFile(newVideoUpload.publicId));
    }
    if (newThumbnailUpload) {
      const thumbnailStorage = createStorage(storageConfig.thumbnailStorage);
      cleanupPromises.push(thumbnailStorage.deleteFile(newThumbnailUpload.publicId));
    }

    if (cleanupPromises.length > 0) {
      await Promise.allSettled(cleanupPromises).then(results => {
        results.forEach(result => {
          if (result.status === "rejected") {
            console.error(
              "Critical: Failed to clean up (delete) new file after an error during video update. Manual cleanup may be required.",
              result.reason
            );
          }
        });
      });
    }
    throw error;
  }
};

export const deleteVideo = async (videoId: string): Promise<void> => {
  const video = await Video.findByIdAndDelete(videoId);

  if (!video) {
    throwError(HttpStatusCode.NOT_FOUND, "Video not found");
    return;
  }

  const deletionPromises: Promise<void>[] = [];
  const { videoFile, thumbnail } = video;

  if (videoFile?.publicId) {
    const videoStorage = createStorage(storageConfig.videoStorage);
    deletionPromises.push(videoStorage.deleteFile(videoFile.publicId));
  }

  if (thumbnail?.publicId) {
    const thumbnailStorage = createStorage(storageConfig.thumbnailStorage);
    deletionPromises.push(thumbnailStorage.deleteFile(thumbnail.publicId));
  }

  if (deletionPromises.length > 0) {
    const results = await Promise.allSettled(deletionPromises);
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const failedPublicId = index === 0 ? videoFile.publicId : thumbnail.publicId;
        console.error(
          `Failed to delete file with publicId '${failedPublicId}' from storage:`,
          result.reason
        );
      }
    });
  }
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

export const videoService = {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getVideoDuration,
};

export default videoService;
