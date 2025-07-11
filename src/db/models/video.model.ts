import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

import type { IVideo, VideoModel } from "../types/video.types";

const videoSchema = new Schema<IVideo, VideoModel>(
  {
    videoFile: {
      type: String, // cloudinary url
      required: true,
    },
    thumbnail: {
      type: String, // cloudinary url
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      maxlength: [100, "Title must be no more than 100 characters long"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [5000, "Description must be no more than 5000 characters long"],
    },
    duration: {
      type: Number,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model<IVideo, VideoModel>("Video", videoSchema);
