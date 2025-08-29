import { Hono } from "hono";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import authMiddleware from "@/middlewares/is-authmiddleware";
import { playlistService } from "@/services/playlist.service";
import { sendSuccessResponse } from "@/utils/response.utils";
import { zCustomValidator } from "@/utils/zod-validator.utils";
import {
  createPlaylistSchema,
  getUserPlaylistsQuerySchema,
  playlistIdParamSchema,
  searchPlaylistsQuerySchema,
  updatePlaylistSchema,
  userIdParamSchema,
  videoIdParamSchema,
} from "@/validation/playlist.validation";

const playlistRouter = new Hono();

// Create playlist
playlistRouter.post(
  "/",
  authMiddleware,
  zCustomValidator("json", createPlaylistSchema),
  async c => {
    const { name, description } = c.req.valid("json");
    const { _id: ownerId } = c.get("user");

    const playlist = await playlistService.createPlaylist({
      name,
      description,
      ownerId,
    });

    return sendSuccessResponse(
      c,
      playlist,
      "Playlist created successfully",
      HttpStatusCode.CREATED
    );
  }
);

// Search playlists globally
playlistRouter.get(
  "/search",
  authMiddleware,
  zCustomValidator("query", searchPlaylistsQuerySchema),
  async c => {
    const { query, page, limit, sort } = c.req.valid("query");

    const result = await playlistService.searchPlaylists({
      query,
      page,
      limit,
      sort,
    });

    return sendSuccessResponse(c, result, "Playlists search completed successfully");
  }
);

// Get playlist by ID
playlistRouter.get(
  "/:playlistId",
  authMiddleware,
  zCustomValidator("param", playlistIdParamSchema),
  async c => {
    const { playlistId } = c.req.valid("param");

    const playlist = await playlistService.getPlaylistById({
      playlistId,
    });

    return sendSuccessResponse(c, playlist, "Playlist fetched successfully");
  }
);

// Update playlist
playlistRouter.patch(
  "/:playlistId",
  authMiddleware,
  zCustomValidator("param", playlistIdParamSchema),
  zCustomValidator("json", updatePlaylistSchema),
  async c => {
    const { playlistId } = c.req.valid("param");
    const { name, description } = c.req.valid("json");
    const { _id: ownerId } = c.get("user");

    const updatedPlaylist = await playlistService.updatePlaylist({
      playlistId,
      name,
      description,
      ownerId,
    });

    return sendSuccessResponse(c, updatedPlaylist, "Playlist updated successfully");
  }
);

// Delete playlist
playlistRouter.delete(
  "/:playlistId",
  authMiddleware,
  zCustomValidator("param", playlistIdParamSchema),
  async c => {
    const { playlistId } = c.req.valid("param");
    const { _id: ownerId } = c.get("user");

    const deletedPlaylist = await playlistService.deletePlaylist({
      playlistId,
      ownerId,
    });

    return sendSuccessResponse(c, deletedPlaylist, "Playlist deleted successfully");
  }
);

// Add video to playlist
playlistRouter.patch(
  "/add/:videoId/:playlistId",
  authMiddleware,
  zCustomValidator("param", videoIdParamSchema),
  zCustomValidator("param", playlistIdParamSchema),
  async c => {
    const { videoId, playlistId } = c.req.valid("param");
    const { _id: ownerId } = c.get("user");

    const updatedPlaylist = await playlistService.addVideoToPlaylist({
      playlistId,
      videoId,
      ownerId,
    });

    return sendSuccessResponse(c, updatedPlaylist, "Video added to playlist successfully");
  }
);

// Remove video from playlist
playlistRouter.patch(
  "/remove/:videoId/:playlistId",
  authMiddleware,
  zCustomValidator("param", videoIdParamSchema),
  zCustomValidator("param", playlistIdParamSchema),
  async c => {
    const { videoId, playlistId } = c.req.valid("param");
    const { _id: ownerId } = c.get("user");

    const updatedPlaylist = await playlistService.removeVideoFromPlaylist({
      playlistId,
      videoId,
      ownerId,
    });

    return sendSuccessResponse(c, updatedPlaylist, "Video removed from playlist successfully");
  }
);

// Get user playlists
playlistRouter.get(
  "/user/:userId",
  authMiddleware,
  zCustomValidator("param", userIdParamSchema),
  zCustomValidator("query", getUserPlaylistsQuerySchema),
  async c => {
    const { userId } = c.req.valid("param");
    const { page, limit, search, sort } = c.req.valid("query");

    const result = await playlistService.getUserPlaylists({
      userId,
      page,
      limit,
      search,
      sort,
    });

    return sendSuccessResponse(c, result, "User playlists fetched successfully");
  }
);

export default playlistRouter;
