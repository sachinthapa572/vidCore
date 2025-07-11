import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

import type { CommentModel, IComment } from "../types/comment.types";

const commentSchema = new Schema<IComment, CommentModel>(
  {
    content: {
      type: String,
      required: [true, "Content is required"],
      maxlength: [1000, "Comment cannot be more than 1000 characters"],
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: [true, "Video is required"],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model<IComment, CommentModel>("Comment", commentSchema);
