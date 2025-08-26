import type { FileStorageInterface } from "@/interfaces/file-storage.interface";
import { ImageKitStorage } from "@/services/storage/imagekit-storage.service";
import { LocalFileStorage } from "@/services/storage/local-file-storage.service";
import { S3Storage } from "@/services/storage/s3-storage.service";

export function createStorage(type: string): FileStorageInterface {
  switch (type.toLowerCase()) {
    case "local":
      return new LocalFileStorage();
    case "imagekit":
      return new ImageKitStorage();
    case "s3":
      return new S3Storage();
    case "aws":
      return new S3Storage();
    default:
      throw new Error(`Unsupported storage type: ${type}`);
  }
}
