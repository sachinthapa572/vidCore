import type { Document, Model, Schema } from "mongoose";

export type IComment = {
  content: string;
  video: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
} & Document;

export type CommentModel = Model<IComment>;
