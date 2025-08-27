import type { Job } from "agenda";

import {
  agenda,
  type CleanupJobData,
  type HardDeleteVideoJobData,
  JOB_TYPES,
  type RecoverVideoJobData,
  type SoftDeleteVideoJobData,
} from "@/config/agenda";
import { storageConfig } from "@/config/storage.config";
import { Video } from "@/db/models/video.model";
import { createStorage } from "@/services/storage/storage.factory";



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
