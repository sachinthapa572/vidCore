import { Hono } from "hono";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import authMiddleware from "@/middlewares/is-authmiddleware";
import { commentService } from "@/services/comment.service";
import { sendSuccessResponse } from "@/utils/response.utils";
import { zCustomValidator } from "@/utils/zod-validator.utils";
import {
  addCommentSchema,
  commentIdParamSchema,
  getVideoCommentsQuerySchema,
  pinCommentSchema,
  replyToCommentSchema,
  updateCommentSchema,
  videoIdParamSchema,
} from "@/validation/comment.validation";

const commentRouter = new Hono();

// Get comments for a video
commentRouter.get(
  "/:videoId",
  authMiddleware,
  zCustomValidator("param", videoIdParamSchema),
  zCustomValidator("query", getVideoCommentsQuerySchema),
  async c => {
    const { videoId } = c.req.valid("param");
    const { page, limit, sort } = c.req.valid("query");
    const { _id: userId } = c.get("user");

    const comments = await commentService.getVideoComments({
      videoId,
      page,
      limit,
      sort,
      userId,
    });

    return sendSuccessResponse(c, comments, "Comments fetched successfully");
  }
);

// Add comment to a video
commentRouter.post(
  "/:videoId",
  authMiddleware,
  zCustomValidator("param", videoIdParamSchema),
  zCustomValidator("json", addCommentSchema),
  async c => {
    const { videoId } = c.req.valid("param");
    const { content, parentId } = c.req.valid("json");
    const { _id: ownerId } = c.get("user");

    const comment = await commentService.addComment({
      content,
      videoId,
      ownerId,
      parentId,
    });

    return sendSuccessResponse(c, comment, "Comment added successfully", HttpStatusCode.CREATED);
  }
);

// Reply to a comment
commentRouter.post(
  "/c/:commentId/reply",
  authMiddleware,
  zCustomValidator("param", commentIdParamSchema),
  zCustomValidator("json", replyToCommentSchema),
  async c => {
    const { commentId } = c.req.valid("param");
    const { content } = c.req.valid("json");
    const { _id: ownerId } = c.get("user");

    const reply = await commentService.replyToComment({
      content,
      commentId,
      ownerId,
    });

    return sendSuccessResponse(c, reply, "Reply added successfully", HttpStatusCode.CREATED);
  }
);

// Pin or unpin a comment
commentRouter.patch(
  "/c/:commentId/pin",
  authMiddleware,
  zCustomValidator("param", commentIdParamSchema),
  zCustomValidator("json", pinCommentSchema),
  async c => {
    const { commentId } = c.req.valid("param");
    const { isPinned } = c.req.valid("json");
    const { _id: userId } = c.get("user");

    const updatedComment = await commentService.pinComment({
      commentId,
      userId,
      isPinned,
    });

    const action = isPinned ? "pinned" : "unpinned";
    return sendSuccessResponse(c, updatedComment, `Comment ${action} successfully`);
  }
);

// Update comment
commentRouter.patch(
  "/c/:commentId",
  authMiddleware,
  zCustomValidator("param", commentIdParamSchema),
  zCustomValidator("json", updateCommentSchema),
  async c => {
    const { commentId } = c.req.valid("param");
    const { content } = c.req.valid("json");
    const { _id: ownerId } = c.get("user");

    const updatedComment = await commentService.updateComment({
      commentId,
      content,
      ownerId,
    });

    return sendSuccessResponse(c, updatedComment, "Comment updated successfully");
  }
);

// Delete comment
commentRouter.delete(
  "/c/:commentId",
  authMiddleware,
  zCustomValidator("param", commentIdParamSchema),
  async c => {
    const { commentId } = c.req.valid("param");
    const { _id: ownerId } = c.get("user");

    const deletedComment = await commentService.deleteComment({
      commentId,
      ownerId,
    });

    return sendSuccessResponse(c, deletedComment, "Comment deleted successfully");
  }
);

export default commentRouter;
