export interface FileStorageInterface {
  uploadFile(file: File, folder: string): Promise<{ url: string; publicId: string }>;
  deleteFile(publicId: string): Promise<void>;
}