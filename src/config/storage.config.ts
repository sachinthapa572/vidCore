import appEnv from "@/db/env";

export const storageConfig = {
  videoStorage: appEnv.VIDEO_STORAGE_TYPE || "local",
  thumbnailStorage: appEnv.THUMBNAIL_STORAGE_TYPE || "imagekit",
};
