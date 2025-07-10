import type mongoose from "mongoose";
import type { Document } from "mongoose";

export type IPlaylist = {
  name: string;
  description: string;
  videos: mongoose.Types.ObjectId[];
  owner: mongoose.Types.ObjectId;
} & Document;

export type PlaylistModel = mongoose.Model<IPlaylist>;
