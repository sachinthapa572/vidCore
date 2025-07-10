import type { Document, Model, Schema } from "mongoose";

export type IVideo = {
  videoFile: string;
  thumbnail: string;
  title: string;
  description: string;
  duration: number;
  views: number;
  isPublished: boolean;
  owner: Schema.Types.ObjectId;
} & Document;

export type VideoModel = Model<IVideo>;
