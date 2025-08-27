import type { Job } from "agenda";

import {
  agenda,
  type CleanupJobData,
  type HardDeleteVideoJobData,
  JOB_TYPES,
  type RecoverVideoJobData,
  type SoftDeleteVideoJobData,
  type UpdateVideoJobData,
  type VideoJobData,
} from "@/config/agenda";
import { storageConfig } from "@/config/storage.config";
import { Video } from "@/db/models/video.model";
import { createStorage } from "@/services/storage/storage.factory";

// Main video processing job
agenda.define(JOB_TYPES.PROCESS_VIDEO, async (job: Job<VideoJobData>) => {
  const { videoId, videoFile, thumbnail }: VideoJobData = job.attrs.data;

  try {
    console.log(`Processing video upload job for videoId: ${videoId}`);

    // Update status to processing
    await Video.findByIdAndUpdate(videoId, {
      uploadStatus: "processing",
      retryCount: job.attrs.failCount || 0,
    });

    const videoStorage = createStorage(storageConfig.videoStorage);
    const thumbnailStorage = createStorage(storageConfig.thumbnailStorage);

    // Upload files in parallel
    const [videoUpload, thumbnailUpload] = await Promise.all([
      videoStorage.uploadFile(videoFile, "videos"),
      thumbnailStorage.uploadFile(thumbnail, "thumbnails"),
    ]);

    // Get video duration
    // const duration = await getVideoDuration(videoUpload.url);

    // Update video record with completed status
    await Video.findByIdAndUpdate(videoId, {
      videoFile: {
        url: videoUpload.url,
        publicId: videoUpload.publicId,
      },
      thumbnail: {
        url: thumbnailUpload.url,
        publicId: thumbnailUpload.publicId,
      },
      duration: videoFile.size,
      uploadStatus: "completed",
      errorMessage: null, // Clear any previous error
    });

    console.log(`Video upload completed successfully for videoId: ${videoId}`);
  } catch (error) {
    console.error(`Video processing failed for videoId: ${videoId}`, error);

    // Update video status to failed
    await Video.findByIdAndUpdate(videoId, {
      uploadStatus: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error occurred",
      retryCount: (job.attrs.failCount || 0) + 1,
    });

    // If this is not the last retry, rethrow to trigger agenda's retry mechanism
    if ((job.attrs.failCount || 0) < 3) {
      throw error;
    }

    // After max retries, schedule cleanup job
    const cleanupData: CleanupJobData = {
      videoId,
      videoPublicId: undefined, // We don't have this info in failed state
      thumbnailPublicId: undefined,
    };

    await agenda.schedule("5 minutes from now", JOB_TYPES.CLEANUP_FAILED_UPLOAD, cleanupData);
  }
});

// Update video job
agenda.define(JOB_TYPES.UPDATE_VIDEO, async (job: Job<UpdateVideoJobData>) => {
  const { videoId, title, description, videoFile, thumbnail }: UpdateVideoJobData = job.attrs.data;

  try {
    console.log(`Processing video update job for videoId: ${videoId}`);

    // Update status to processing
    await Video.findByIdAndUpdate(videoId, {
      uploadStatus: "updating",
      retryCount: job.attrs.failCount || 0,
    });

    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error(`Video with ID ${videoId} not found`);
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

    // Upload new files if provided
    if (videoFile) {
      const videoStorage = createStorage(storageConfig.videoStorage);
      newVideoUpload = await videoStorage.uploadFile(videoFile, "videos");
      updatedFields.videoFile = newVideoUpload;
      //   updatedFields.duration = await getVideoDuration(newVideoUpload.url);
      updatedFields.duration = videoFile.size;
    }

    if (thumbnail) {
      const thumbnailStorage = createStorage(storageConfig.thumbnailStorage);
      newThumbnailUpload = await thumbnailStorage.uploadFile(thumbnail, "thumbnails");
      updatedFields.thumbnail = newThumbnailUpload;
    }

    // Update video record
    await Video.findByIdAndUpdate(videoId, {
      $set: updatedFields,
      uploadStatus: "completed",
      errorMessage: null,
    });

    // Delete old files if new ones were uploaded
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
      await Promise.allSettled(deletePromises);
    }

    console.log(`Video update completed successfully for videoId: ${videoId}`);
  } catch (error) {
    console.error(`Video update failed for videoId: ${videoId}`, error);

    // Update video status to failed
    await Video.findByIdAndUpdate(videoId, {
      uploadStatus: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error occurred",
      retryCount: (job.attrs.failCount || 0) + 1,
    });

    // If this is not the last retry, rethrow to trigger agenda's retry mechanism
    if ((job.attrs.failCount || 0) < 3) {
      throw error;
    }
  }
});

// Soft delete video job
agenda.define(JOB_TYPES.SOFT_DELETE_VIDEO, async (job: Job<SoftDeleteVideoJobData>) => {
  const { videoId }: SoftDeleteVideoJobData = job.attrs.data;

  try {
    console.log(`Processing video soft delete job for videoId: ${videoId}`);

    // Mark video as soft deleted and schedule hard delete after 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const hardDeleteJobData: HardDeleteVideoJobData = {
      videoId,
    };

    // Schedule hard delete job for 7 days from now
    const hardDeleteJob = await agenda.schedule(
      sevenDaysFromNow,
      JOB_TYPES.HARD_DELETE_VIDEO,
      hardDeleteJobData
    );

    // Update video record with soft delete info
    await Video.findByIdAndUpdate(videoId, {
      isDeleted: true,
      deletedAt: new Date(),
      hardDeleteJobId: hardDeleteJob.attrs._id.toString(),
    });

    console.log(
      `Video soft delete completed successfully for videoId: ${videoId}. Hard delete scheduled for ${sevenDaysFromNow.toISOString()}`
    );
  } catch (error) {
    console.error(`Video soft delete failed for videoId: ${videoId}`, error);
    throw error; // Allow retry for soft delete
  }
});

// Hard delete video job (permanent deletion)
agenda.define(JOB_TYPES.HARD_DELETE_VIDEO, async (job: Job<HardDeleteVideoJobData>) => {
  const { videoId }: HardDeleteVideoJobData = job.attrs.data;

  try {
    console.log(`Processing video hard delete job for videoId: ${videoId}`);

    // Get video details before deletion
    const video = await Video.findById(videoId);
    if (!video) {
      console.log(`Video ${videoId} not found, may have been already deleted`);
      return;
    }

    // Delete files from storage first
    const deletionPromises: Promise<void>[] = [];

    if (video.videoFile?.publicId) {
      const videoStorage = createStorage(storageConfig.videoStorage);
      deletionPromises.push(videoStorage.deleteFile(video.videoFile.publicId));
    }

    if (video.thumbnail?.publicId) {
      const thumbnailStorage = createStorage(storageConfig.thumbnailStorage);
      deletionPromises.push(thumbnailStorage.deleteFile(video.thumbnail.publicId));
    }

    if (deletionPromises.length > 0) {
      const results = await Promise.allSettled(deletionPromises);
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const failedPublicId =
            index === 0 ? video.videoFile?.publicId : video.thumbnail?.publicId;
          console.error(
            `Failed to delete file with publicId '${failedPublicId}' from storage:`,
            result.reason
          );
        }
      });
    }

    // Delete video record from database
    await Video.findByIdAndDelete(videoId);

    console.log(`Video hard delete completed successfully for videoId: ${videoId}`);
  } catch (error) {
    console.error(`Video hard delete failed for videoId: ${videoId}`, error);
    // Don't throw error here as hard delete operations shouldn't retry
  }
});

// Recover video job
agenda.define(JOB_TYPES.RECOVER_VIDEO, async (job: Job<RecoverVideoJobData>) => {
  const { videoId }: RecoverVideoJobData = job.attrs.data;

  try {
    console.log(`Processing video recovery job for videoId: ${videoId}`);

    // Get video details
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error(`Video with ID ${videoId} not found`);
    }

    // Cancel the scheduled hard delete job if it exists
    if (video.hardDeleteJobId) {
      try {
        await agenda.cancel({ _id: video.hardDeleteJobId });
        console.log(`Cancelled hard delete job ${video.hardDeleteJobId} for video ${videoId}`);
      } catch (cancelError) {
        console.warn(`Failed to cancel hard delete job ${video.hardDeleteJobId}:`, cancelError);
        // Continue with recovery even if job cancellation fails
      }
    }

    // Restore video by removing soft delete flags
    await Video.findByIdAndUpdate(videoId, {
      isDeleted: false,
      deletedAt: null,
      hardDeleteJobId: null,
    });

    console.log(`Video recovery completed successfully for videoId: ${videoId}`);
  } catch (error) {
    console.error(`Video recovery failed for videoId: ${videoId}`, error);
    throw error; 
  }
});

// Cleanup failed uploads
agenda.define(JOB_TYPES.CLEANUP_FAILED_UPLOAD, async (job: Job<CleanupJobData>) => {
  const { videoId, videoPublicId, thumbnailPublicId }: CleanupJobData = job.attrs.data;

  try {
    console.log(`Cleaning up failed upload for videoId: ${videoId}`);

    const deletionPromises: Promise<void>[] = [];

    if (videoPublicId) {
      const videoStorage = createStorage(storageConfig.videoStorage);
      deletionPromises.push(videoStorage.deleteFile(videoPublicId));
    }

    if (thumbnailPublicId) {
      const thumbnailStorage = createStorage(storageConfig.thumbnailStorage);
      deletionPromises.push(thumbnailStorage.deleteFile(thumbnailPublicId));
    }

    if (deletionPromises.length > 0) {
      await Promise.allSettled(deletionPromises);
    }

    // Optionally delete the video record after cleanup
    // await Video.findByIdAndDelete(videoId);

    console.log(`Cleanup completed for videoId: ${videoId}`);
  } catch (error) {
    console.error(`Cleanup failed for videoId: ${videoId}`, error);
    // Don't throw error here as cleanup failures shouldn't retry
  }
});

export default agenda;
