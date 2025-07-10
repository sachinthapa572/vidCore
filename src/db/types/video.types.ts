import type { Document, Model } from "mongoose";
import type mongoose from "mongoose";

export type IVideo = {
  videoFile: string;
  thumbnail: string;
  title: string;
  description: string;
  duration: number;
  views: number;
  isPublished: boolean;
  owner: mongoose.Types.ObjectId;
} & Document;

export type VideoModel = Model<IVideo>;
