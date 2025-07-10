import type { Document, Model, Schema } from "mongoose";

export type ILike = {
  video?: string;
  comment?: string;
  tweet?: string;
  likedBy: Schema.Types.ObjectId;
} & Document;

export type LikeModel = Model<ILike>;
