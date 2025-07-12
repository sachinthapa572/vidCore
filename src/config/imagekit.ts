import ImageKit from "imagekit";
import type { UploadOptions, UploadResponse } from "imagekit/dist/libs/interfaces";
import type IKResponse from "imagekit/dist/libs/interfaces/IKResponse";

import appEnv from "@/db/env";

class ImageKitService {
  private imagekit: ImageKit;

  constructor() {
    this.imagekit = new ImageKit({
      publicKey: appEnv.IMAGEKIT_PUBLIC_KEY,
      privateKey: appEnv.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: appEnv.IMAGEKIT_URL_ENDPOINT,
    });
  }

  // Upload the image to ImageKit
  async upload(data: UploadOptions): Promise<IKResponse<UploadResponse>> {
    if (!data.file || !data.fileName) {
      throw new Error("Missing required upload data: file and fileName.");
    }
    try {
      return await this.imagekit.upload({ ...data });
    } catch (error) {
      // Log error securely
      console.error("ImageKit upload error:", error);
      throw new Error("Failed to upload image.");
    }
  }

  // Remove the image from ImageKit
  async delete(fileId: string): Promise<IKResponse<void>> {
    if (!fileId) {
      throw new Error("Missing fileId for deletion.");
    }
    try {
      return await this.imagekit.deleteFile(fileId);
    } catch (error) {
      // Log error securely
      console.error("ImageKit delete error:", error);
      throw new Error("Failed to delete image.");
    }
  }
}

export const imageKitService = new ImageKitService();
