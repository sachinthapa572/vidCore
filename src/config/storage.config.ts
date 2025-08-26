export const storageConfig = {
  videoStorage: process.env.VIDEO_STORAGE_TYPE || "local",
  thumbnailStorage: process.env.THUMBNAIL_STORAGE_TYPE || "imagekit",
};
