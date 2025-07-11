import mongoose, { Schema } from "mongoose";

import type { IPlaylist, PlaylistModel } from "../types/playlist.types";

const playlistSchema = new Schema<IPlaylist, PlaylistModel>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    videos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
    },
  },
  { timestamps: true }
);

export const Playlist = mongoose.model<IPlaylist, PlaylistModel>("Playlist", playlistSchema);
