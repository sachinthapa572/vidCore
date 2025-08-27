import Agenda from "agenda";
import type { Types } from "mongoose";

import appEnv from "@/db/env";

export const agenda = new Agenda({
  db: {
    address: appEnv.DATABASE_URL,
    collection: "agendaJobs",
  },
  processEvery: "10 seconds",
  maxConcurrency: 5, // Limit concurrent jobs to prevent system overload
  defaultConcurrency: 3,
  defaultLockLifetime: 10000, // 10 seconds
});

// Job types
export const JOB_TYPES = {
  PROCESS_VIDEO: "processVideo",
  UPDATE_VIDEO: "updateVideo",
  SOFT_DELETE_VIDEO: "softDeleteVideo",
  HARD_DELETE_VIDEO: "hardDeleteVideo",
  RECOVER_VIDEO: "recoverVideo",
  CLEANUP_FAILED_UPLOAD: "cleanupFailedUpload",
} as const;

// Job data types
export interface VideoJobData {
  videoId: string;
  videoFile: File;
  thumbnail: File;
  title: string;
  description: string;
  owner: Types.ObjectId;
}

export interface UpdateVideoJobData {
  videoId: string;
  title?: string;
  description?: string;
  videoFile?: File;
  thumbnail?: File;
}

export interface DeleteVideoJobData {
  videoId: string;
  videoPublicId?: string;
  thumbnailPublicId?: string;
}

export interface SoftDeleteVideoJobData {
  videoId: string;
}

export interface HardDeleteVideoJobData {
  videoId: string;
  videoPublicId?: string;
  thumbnailPublicId?: string;
}

export interface RecoverVideoJobData {
  videoId: string;
}

export interface CleanupJobData {
  videoId: string;
  videoPublicId?: string;
  thumbnailPublicId?: string;
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down agenda gracefully...");
  await agenda.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Shutting down agenda gracefully...");
  await agenda.stop();
  process.exit(0);
});

export default agenda;
