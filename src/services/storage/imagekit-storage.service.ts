import { encodeBase64 } from "hono/utils/encode";

import { imageKitService } from "@/config/imagekit";
import type { FileStorageInterface } from "@/interfaces/file-storage.interface";

export class ImageKitStorage implements FileStorageInterface {
  async uploadFile(file: File, folder: string) {
    const buffer = await file.arrayBuffer();
    const result = await imageKitService.upload({
      file: encodeBase64(buffer),
      fileName: file.name,
      folder: folder,
    });
    return {
      url: result.url,
      publicId: result.fileId,
    };
  }

  async deleteFile(publicId: string) {
    try {
      await imageKitService.deleteFile(publicId);
    } catch (error) {
      console.error("Error deleting ImageKit file:", error);
      throw error;
    }
  }
}
