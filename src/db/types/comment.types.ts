import type mongoose from "mongoose";
import type { Document } from "mongoose";

export type IComment = {
  content: string;
  video: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
} & Document;

export type CommentModel = mongoose.Model<IComment>;
