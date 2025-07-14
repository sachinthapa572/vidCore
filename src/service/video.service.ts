import fs from "node:fs/promises";
import { encodeBase64 } from "hono/utils/encode";
import { Types } from "mongoose";

import { imageKitService } from "@/config/imagekit";
import { Video } from "@/db/models/video.model";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { throwError } from "@/utils/api-error";
import type { videoValidationInput } from "@/validation/video.validation";

// Helper function to manage file system operations
const handleFileUpload = async (file: File, folder: string) => {
  const dirPath = `./public/${folder}`;
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
  const filePath = `${dirPath}/${file.name}`;
  await Bun.write(filePath, file);
  return {
    url: `/${folder}/${file.name}`,
    publicId: file.name,
  };
};

// Helper function to upload to ImageKit
const handleImageKitUpload = async (file: File) => {
  const buffer = await file.arrayBuffer();
  return imageKitService.upload({
    file: encodeBase64(buffer),
    fileName: file.name,
    folder: "thumbnails",
  });
};

export const videoService = {
  async createVideo(data: videoValidationInput) {
    const [videoUpload, thumbnailUpload] = await Promise.all([
      handleFileUpload(data.videoFile, "videos"),
      handleImageKitUpload(data.thumbnail),
    ]);

    const videoDocs = await Video.create({
      videoFile: {
        url: videoUpload.url,
        publicId: videoUpload.publicId,
      },
      thumbnail: {
        url: thumbnailUpload.url,
        publicId: thumbnailUpload.fileId,
      },
      title: data.title,
      description: data.description,
      owner: new Types.ObjectId(data.owner),
      duration: 0, // Placeholder for duration
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
  },
};
