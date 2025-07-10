import type mongoose from "mongoose";
import type { Document, Model } from "mongoose";

export type ILike = {
  video?: mongoose.Types.ObjectId;
  comment?: mongoose.Types.ObjectId;
  tweet?: mongoose.Types.ObjectId;
  likedBy: mongoose.Types.ObjectId;
} & Document;
export type LikeModel = Model<ILike>;
