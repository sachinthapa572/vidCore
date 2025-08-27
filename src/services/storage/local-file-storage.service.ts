import fs from "node:fs/promises";
import path from "node:path";

import type { FileStorageInterface } from "@/interfaces/file-storage.interface";

export class LocalFileStorage implements FileStorageInterface {
  async uploadFile(file: File, folder: string) {
    const dirPath = path.join(process.cwd(), "public", folder);
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
    const parsed = path.parse(file.name);
    const uuid = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
    const uniqueName = `${parsed.name}-${uuid}${parsed.ext}`;
    const filePath = path.join(dirPath, uniqueName);
    await Bun.write(filePath, file);
    return {
      url: `/${folder}/${uniqueName}`,
      publicId: uniqueName,
    };
  }

  async deleteFile(publicId: string) {
    const filePath = path.join(process.cwd(), "public", publicId);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Error deleting local file:", error);
      throw error;
    }
  }
}
