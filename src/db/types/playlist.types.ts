import type { Document, Model, Schema } from "mongoose";

export type IPlaylist = {
  name: string;
  description: string;
  videos: string[];
  owner: Schema.Types.ObjectId;
} & Document;

export type PlaylistModel = Model<IPlaylist>;
