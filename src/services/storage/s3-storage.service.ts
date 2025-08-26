import { S3Client } from "bun";

import appEnv from "@/db/env";
import type { FileStorageInterface } from "@/interfaces/file-storage.interface";

export class S3Storage implements FileStorageInterface {
  private client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    this.bucketName = appEnv.AWS_BUCKET_NAME || "default-bucket";
    this.region = appEnv.AWS_REGION || "us-east-1";

    this.client = new S3Client({
      region: this.region,
      accessKeyId: appEnv.AWS_ACCESS_KEY_ID,
      secretAccessKey: appEnv.AWS_SECRET_ACCESS_KEY,
      bucket: this.bucketName,
    });
  }

  async uploadFile(file: File, folder: string) {
    const key = `${folder}/${file.name}`;

    try {
      await this.client.write(key, file);

      return {
        url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`,
        publicId: key,
      };
    } catch (error) {
      console.error("Error uploading to S3:", error);
      throw error;
    }
  }

  async deleteFile(publicId: string) {
    try {
      await this.client.delete(publicId);
    } catch (error) {
      console.error("Error deleting S3 file:", error);
      throw error;
    }
  }
}
