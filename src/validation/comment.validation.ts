import { z } from "zod/v4";

import { objectId } from "./video.validation";

export const addCommentSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Comment content is required" })
    .max(1000, { message: "Comment cannot be more than 1000 characters" }),
  parentId: objectId.optional(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Comment content is required" })
    .max(1000, { message: "Comment cannot be more than 1000 characters" }),
});

export const commentIdParamSchema = z.object({
  commentId: objectId,
});

export const videoIdParamSchema = z.object({
  videoId: objectId,
});

export const replyToCommentSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Reply content is required" })
    .max(1000, { message: "Reply cannot be more than 1000 characters" }),
});

export const pinCommentSchema = z.object({
  isPinned: z.boolean(),
});

export const getVideoCommentsQuerySchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).optional().default(10),
  sort: z.enum(["recent", "oldest", "most_liked", "least_liked", "my_comments"]).optional().default("recent"),
});

export type addCommentInput = z.infer<typeof addCommentSchema>;
export type updateCommentInput = z.infer<typeof updateCommentSchema>;
export type replyToCommentInput = z.infer<typeof replyToCommentSchema>;
export type pinCommentInput = z.infer<typeof pinCommentSchema>;
export type getVideoCommentsQueryInput = z.infer<typeof getVideoCommentsQuerySchema>;
