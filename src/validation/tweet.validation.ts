import { z } from "zod/v4";

import { objectId } from "./video.validation";

export const createTweetSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Tweet content is required" })
    .max(280, { message: "Tweet cannot be more than 280 characters" }),
});

export const updateTweetSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Tweet content is required" })
    .max(280, { message: "Tweet cannot be more than 280 characters" }),
});

export const tweetIdParamSchema = z.object({
  tweetId: objectId,
});

export const userIdParamSchema = z.object({
  userId: objectId,
});

export const getUserTweetsQuerySchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
  sort: z.enum(["recent", "oldest", "most_liked", "least_liked", "my_tweets"]).optional(),
});

export const pinTweetSchema = z.object({
  isPinned: z.boolean(),
});

export type createTweetInput = z.infer<typeof createTweetSchema>;
export type updateTweetInput = z.infer<typeof updateTweetSchema>;
export type getUserTweetsQueryInput = z.infer<typeof getUserTweetsQuerySchema>;
export type pinTweetInput = z.infer<typeof pinTweetSchema>;
