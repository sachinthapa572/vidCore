import { z } from "zod/v4";

import { objectId } from "./video.validation";

export const createPlaylistSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Playlist name is required" })
    .max(100, { message: "Playlist name cannot be more than 100 characters" }),
  description: z
    .string()
    .min(1, { message: "Playlist description is required" })
    .max(500, { message: "Playlist description cannot be more than 500 characters" }),
});

export const updatePlaylistSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "Playlist name is required" })
      .max(100, { message: "Playlist name cannot be more than 100 characters" })
      .optional(),
    description: z
      .string()
      .min(1, { message: "Playlist description is required" })
      .max(500, { message: "Playlist description cannot be more than 500 characters" })
      .optional(),
  })
  .refine(data => data.name || data.description, {
    message: "At least one field (name or description) must be provided for update",
  });

export const playlistIdParamSchema = z.object({
  playlistId: objectId,
});

export const videoIdParamSchema = z.object({
  videoId: objectId,
});

export const userIdParamSchema = z.object({
  userId: objectId,
});

export const getUserPlaylistsQuerySchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  search: z.string().optional(),
  sort: z.enum(["recent", "oldest", "name_asc", "name_desc"]).optional(),
});

export const searchPlaylistsQuerySchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  query: z.string().min(1, { message: "Search query is required" }),
  sort: z.enum(["recent", "oldest", "name_asc", "name_desc", "popular"]).optional(),
});

export type createPlaylistInput = z.infer<typeof createPlaylistSchema>;
export type updatePlaylistInput = z.infer<typeof updatePlaylistSchema>;
export type getUserPlaylistsQueryInput = z.infer<typeof getUserPlaylistsQuerySchema>;
export type searchPlaylistsQueryInput = z.infer<typeof searchPlaylistsQuerySchema>;
