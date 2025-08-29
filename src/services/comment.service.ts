import type { Types } from "mongoose";

import { Comment } from "@/db/models/comment.model";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { throwError } from "@/utils/api-error";
import type {
  addCommentInput,
  getVideoCommentsQueryInput,
  pinCommentInput,
  replyToCommentInput,
} from "@/validation/comment.validation";

interface GetVideoCommentsOptions extends getVideoCommentsQueryInput {
  videoId: Types.ObjectId;
  userId?: Types.ObjectId;
}

export const getVideoComments = async (data: GetVideoCommentsOptions) => {
  const { videoId, page = 1, limit = 10, sort = "recent", userId } = data;

  // Build match conditions
  // biome-ignore lint/suspicious/noExplicitAny : any
  const matchConditions: any = {
    video: videoId,
    parent: null,
  };

  // Add user filter for "my_comments" sort
  if (sort === "my_comments" && userId) {
    matchConditions.owner = userId;
  }

  // Build aggregation pipeline
  // biome-ignore lint/suspicious/noExplicitAny : any
  const pipeline: any[] = [
    { $match: matchConditions },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    // Add likes count for sorting
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "parent",
        as: "replies",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $project: {
              content: 1,
              owner: { $arrayElemAt: ["$ownerDetails", 0] },
              createdAt: 1,
              updatedAt: 1,
            },
          },
          { $sort: { createdAt: 1 } },
        ],
      },
    },
    {
      $project: {
        content: 1,
        owner: {
          $arrayElemAt: ["$ownerDetails", 0],
        },
        video: {
          $arrayElemAt: ["$videoDetails", 0],
        },
        replies: 1,
        likesCount: 1,
        isPinned: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];

  // Add sorting based on the sort parameter
  let sortStage: any = {};
  switch (sort) {
    case "recent":
      sortStage = { $sort: { isPinned: -1, createdAt: -1 } };
      break;
    case "oldest":
      sortStage = { $sort: { isPinned: -1, createdAt: 1 } };
      break;
    case "most_liked":
      sortStage = { $sort: { isPinned: -1, likesCount: -1, createdAt: -1 } };
      break;
    case "least_liked":
      sortStage = { $sort: { isPinned: -1, likesCount: 1, createdAt: -1 } };
      break;
    case "my_comments":
      sortStage = { $sort: { isPinned: -1, createdAt: -1 } };
      break;
    default:
      sortStage = { $sort: { isPinned: -1, createdAt: -1 } };
  }

  pipeline.push(sortStage);
  pipeline.push({ $skip: (page - 1) * limit });
  pipeline.push({ $limit: limit });

  const comments = await Comment.aggregate(pipeline);

  if (!comments?.length) {
    throwError(HttpStatusCode.NOT_FOUND, "Comments not found");
    return;
  }

  return comments;
};

export const addComment = async (
  data: addCommentInput & { videoId: Types.ObjectId; ownerId: Types.ObjectId }
) => {
  const { content, videoId, ownerId, parentId } = data;

  // If this is a reply, check if parent comment exists
  if (parentId) {
    const parentComment = await Comment.findById(parentId);
    if (!parentComment) {
      throwError(HttpStatusCode.NOT_FOUND, "Parent comment not found");
    }
  } else {
    const existingComment = await Comment.findOne({
      video: videoId,
      owner: ownerId,
      parent: null,
    });

    if (existingComment) {
      throwError(HttpStatusCode.BAD_REQUEST, "You have already commented on this video");
    }
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: ownerId,
    parent: parentId || null,
  });

  if (!comment) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to add comment");
  }

  return comment;
};

export const updateComment = async (data: {
  commentId: Types.ObjectId;
  content: string;
  ownerId: Types.ObjectId;
}) => {
  const { commentId, content, ownerId } = data;

  if (!content) {
    throwError(HttpStatusCode.BAD_REQUEST, "Comment content is required");
  }

  const updatedComment = await Comment.findOneAndUpdate(
    {
      _id: commentId,
      owner: ownerId,
    },
    {
      $set: {
        content,
      },
    },
    { new: true }
  ).populate("owner", "avatar.url avatarUrl username");

  if (!updatedComment) {
    throwError(
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      "Failed to update comment or comment not found"
    );
  }

  return updatedComment;
};

export const replyToComment = async (
  data: replyToCommentInput & { commentId: Types.ObjectId; ownerId: Types.ObjectId }
) => {
  const { content, commentId, ownerId } = data;

  const parentComment = await Comment.findById(commentId);
  if (!parentComment) {
    throwError(HttpStatusCode.NOT_FOUND, "Parent comment not found");
  }

  const reply = await Comment.create({
    content,
    video: parentComment?.video,
    owner: ownerId,
    parent: commentId,
  });

  if (!reply) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to add reply");
  }

  return reply;
};

export const pinComment = async (
  data: pinCommentInput & { commentId: Types.ObjectId; userId: Types.ObjectId }
) => {
  const { commentId, userId, isPinned } = data;

  // Find the comment
  const comment = await Comment.findById(commentId).populate("video");
  if (!comment) {
    throwError(HttpStatusCode.NOT_FOUND, "Comment not found");
    return;
  }

  // Check if the user is the video owner (can pin comments)
  const video = comment.video as any;
  if (!video?.owner?.equals(userId)) {
    throwError(HttpStatusCode.FORBIDDEN, "Only video owner can pin/unpin comments");
  }

  // Update the comment's pinned status
  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { $set: { isPinned } },
    { new: true }
  ).populate("owner", "avatar.url avatarUrl username");

  if (!updatedComment) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to update comment pin status");
  }

  return updatedComment;
};

export const deleteComment = async (data: {
  commentId: Types.ObjectId;
  ownerId: Types.ObjectId;
}) => {
  const { commentId, ownerId } = data;

  const deletedComment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: ownerId,
  });

  if (!deletedComment) {
    throwError(
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      "Failed to delete comment or comment not found"
    );
  }

  return deletedComment;
};

export const commentService = {
  getVideoComments,
  addComment,
  updateComment,
  replyToComment,
  pinComment,
  deleteComment,
};

export default commentService;
