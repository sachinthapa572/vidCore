import { type Model, model, Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

import type { ObjectId, WithDoc } from "@/types/type";

type Methods = {
  isOwnedBy(userId: ObjectId): boolean;
};

export type IPlaylist = WithDoc<{
  name: string;
  description: string;
  videos: ObjectId[];
  owner: ObjectId;
}> &
  Methods;

export type PlaylistModel = Model<IPlaylist>;

const playlistSchema = new Schema<IPlaylist, PlaylistModel, Methods>(
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

// Instance method to check if playlist is owned by a user
playlistSchema.methods.isOwnedBy = function (userId: ObjectId): boolean {
  return this.owner.equals(userId);
};

playlistSchema.plugin(mongooseAggregatePaginate);

export const Playlist = model<IPlaylist>("Playlist", playlistSchema);
