import type { Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

import type { ObjectId, WithDoc } from "@/types/type";

export type VideoUploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type IVideo = WithDoc<{
  videoFile: {
    url: string;
    publicId: string;
  };
  thumbnail: {
    url: string;
    publicId: string;
  };
  title: string;
  description: string;
  duration: number;
  views: number;
  isPublished: boolean;
  owner: ObjectId;
  uploadStatus: VideoUploadStatus;
  jobId?: string;
  errorMessage?: string;
  retryCount: number;
  isDeleted: boolean;
  deletedAt?: Date;
  hardDeleteJobId?: string;
  createdAt: Date;
  updatedAt: Date;
}>;

export type VideoModel = Model<IVideo>;

const videoSchema = new Schema<IVideo, VideoModel>(
  {
    videoFile: {
      url: {
        type: String,
        required: [true, "Video file URL is required"],
      },
      publicId: {
        type: String,
        required: [true, "Video file public ID is required"],
      },
    },
    thumbnail: {
      url: {
        type: String,
        required: [true, "Thumbnail URL is required"],
      },
      publicId: {
        type: String,
        required: [true, "Thumbnail public ID is required"],
      },
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
    uploadStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      required: true,
    },
    jobId: {
      type: String,
      required: false,
    },
    errorMessage: {
      type: String,
      required: false,
    },
    retryCount: {
      type: Number,
      default: 0,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },
    deletedAt: {
      type: Date,
      required: false,
    },
    hardDeleteJobId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model<IVideo, VideoModel>("Video", videoSchema);
