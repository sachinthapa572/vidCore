import ImageKit from "imagekit";
import type { UploadOptions, UploadResponse, UrlOptions } from "imagekit/dist/libs/interfaces";
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
      const ik = await this.imagekit.upload({ ...data });
      console.log("ImageKit upload response:", ik);
      return ik;
    } catch (error) {
      // Log error securely
      console.error("ImageKit upload error:", error);
      throw new Error("Failed to upload image.");
    }
  }

  // Remove the image from ImageKit
  async deleteFile(fileId: string): Promise<IKResponse<void>> {
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

  async generateFileUrl(data: UrlOptions): Promise<string> {
    if (!data.path) {
      throw new Error("Missing path for generating URL.");
    }
    try {
      const ik = this.imagekit.url({
        ...data,
      });

      console.log("ImageKit generated URL:", ik);
      return ik;
    } catch (error) {
      // Log error securely
      console.error("ImageKit generate URL error:", error);
      throw new Error("Failed to generate image URL.");
    }
  }
}
export const imageKitService = new ImageKitService();
