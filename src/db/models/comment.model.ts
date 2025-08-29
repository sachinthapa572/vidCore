import { type Model, model, Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

import type { ObjectId, WithDoc } from "@/types/type";

type Methods = {
  isOwnedBy(userId: ObjectId): boolean;
};

export type IComment = WithDoc<{
  content: string;
  video: ObjectId;
  owner: ObjectId;
  parent?: ObjectId; // For subcomments/replies
  isPinned?: boolean; // For pinning comments
}> &
  Methods;

export type commmentModel = Model<IComment>;

const commentSchema = new Schema<IComment, commmentModel, Methods>(
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
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ video: 1, owner: 1 }, { unique: true });

commentSchema.methods.isOwnedBy = function (userId: ObjectId): boolean {
  return this.owner.equals(userId);
};

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = model<IComment>("Comment", commentSchema);
