import type { Types } from "mongoose";

import { Playlist } from "@/db/models/playlist.model";
import { Video } from "@/db/models/video.model";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { throwError } from "@/utils/api-error";
import type {
  createPlaylistInput,
  getUserPlaylistsQueryInput,
  searchPlaylistsQueryInput,
  updatePlaylistInput,
} from "@/validation/playlist.validation";

export const createPlaylist = async (data: createPlaylistInput & { ownerId: Types.ObjectId }) => {
  const { name, description, ownerId } = data;

  const playlist = await Playlist.create({
    name,
    description,
    owner: ownerId,
  });

  if (!playlist) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to create playlist");
  }

  return playlist;
};

export const getUserPlaylists = async (
  data: { userId: Types.ObjectId } & getUserPlaylistsQueryInput
) => {
  const { userId, page = 1, limit = 10, search, sort = "recent" } = data;

  // Build the base query
  const query: Record<string, unknown> = { owner: userId };

  // Add search functionality
  if (search?.trim()) {
    query.$or = [{ name: { $regex: search.trim(), $options: "i" } }];
  }
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    recent: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name_asc: { name: 1 },
    name_desc: { name: -1 },
  };

  const sortOptions = sortMap[sort] ?? { createdAt: -1 };

  // Calculate skip value for pagination
  const skip = (page - 1) * limit;

  // Execute query with pagination
  const playlists = await Playlist.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate("videos", "title thumbnail.url duration views");

  // Get total count for pagination metadata
  const totalCount = await Playlist.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limit);

  if (!playlists?.length) {
    throwError(HttpStatusCode.NOT_FOUND, "No playlists found");
  }

  return {
    playlists,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      limit,
    },
  };
};

export const searchPlaylists = async (data: searchPlaylistsQueryInput) => {
  const { query, page = 1, limit = 10, sort = "recent" } = data;

  const searchQuery = {
    $or: [{ name: { $regex: query.trim(), $options: "i" } }],
  };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    recent: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name_asc: { name: 1 },
    name_desc: { name: -1 },
    popular: { createdAt: -1 },
  };

  const sortOptions: Record<string, 1 | -1> = sortMap[sort] ?? { createdAt: -1 };
  const skip = (page - 1) * limit;

  // Execute search query with pagination
  const playlists = await Playlist.find(searchQuery)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate("owner", "username fullName avatar.url")
    .populate("videos", "title thumbnail.url duration views");

  // Get total count for pagination metadata
  const totalCount = await Playlist.countDocuments(searchQuery);
  const totalPages = Math.ceil(totalCount / limit);

  if (!playlists?.length) {
    throwError(HttpStatusCode.NOT_FOUND, "No playlists found matching your search");
  }

  return {
    playlists,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      limit,
    },
    searchQuery: query,
  };
};

export const getPlaylistById = async (data: { playlistId: Types.ObjectId }) => {
  const { playlistId } = data;

  const playlist = await Playlist.findById(playlistId).populate(
    "videos",
    "thumbnail.url title duration views "
  );

  if (!playlist) {
    throwError(HttpStatusCode.NOT_FOUND, "Playlist not found");
  }

  if (!playlist?.isOwnedBy(playlist.owner)) {
    throwError(HttpStatusCode.FORBIDDEN, "You do not have permission to access this playlist");
  }

  return playlist;
};

export const addVideoToPlaylist = async (data: {
  playlistId: Types.ObjectId;
  videoId: Types.ObjectId;
  ownerId: Types.ObjectId;
}) => {
  const { playlistId, videoId, ownerId } = data;

  // Check if video exists and is not deleted
  const video = await Video.findById(videoId);
  if (!video || video.isDeleted) {
    throwError(HttpStatusCode.NOT_FOUND, "Video not found");
  }

  // Check if video is owned by the user
  if (!video?.isOwnedBy(ownerId)) {
    throwError(HttpStatusCode.FORBIDDEN, "You can only add your own videos to playlists");
  }

  // Check if playlist exists and is owned by the user
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throwError(HttpStatusCode.NOT_FOUND, "Playlist not found");
  }

  if (!playlist?.isOwnedBy(ownerId)) {
    throwError(HttpStatusCode.FORBIDDEN, "You can only add videos to your own playlists");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      // $addToSet ensures unique videos are added like the set
      // $push -> adds the video to the end of the array, allowing duplicates
      $addToSet: { videos: videoId },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to add video to playlist");
  }

  return updatedPlaylist;
};

export const removeVideoFromPlaylist = async (data: {
  playlistId: Types.ObjectId;
  videoId: Types.ObjectId;
  ownerId: Types.ObjectId;
}) => {
  const { playlistId, videoId, ownerId } = data;

  // Check if playlist exists and is owned by the user
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throwError(HttpStatusCode.NOT_FOUND, "Playlist not found");
  }

  if (!playlist?.isOwnedBy(ownerId)) {
    throwError(HttpStatusCode.FORBIDDEN, "You can only remove videos from your own playlists");
  }

  // Check if video exists and is owned by the user
  const video = await Video.findById(videoId);
  if (!video || video.isDeleted) {
    throwError(HttpStatusCode.NOT_FOUND, "Video not found");
  }

  if (!video?.isOwnedBy(ownerId)) {
    throwError(HttpStatusCode.FORBIDDEN, "You can only remove your own videos from playlists");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        videos: videoId,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to remove video from playlist");
  }

  return updatedPlaylist;
};

export const deletePlaylist = async (data: {
  playlistId: Types.ObjectId;
  ownerId: Types.ObjectId;
}) => {
  const { playlistId, ownerId } = data;

  // First check if playlist exists and user owns it
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throwError(HttpStatusCode.NOT_FOUND, "Playlist not found");
  }

  if (!playlist?.isOwnedBy(ownerId)) {
    throwError(HttpStatusCode.FORBIDDEN, "You can only delete your own playlists");
  }

  const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

  if (!deletedPlaylist) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to delete playlist");
  }

  return deletedPlaylist;
};

export const updatePlaylist = async (
  data: updatePlaylistInput & { playlistId: Types.ObjectId; ownerId: Types.ObjectId }
) => {
  const { playlistId, name, description, ownerId } = data;

  // First check if playlist exists and user owns it
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throwError(HttpStatusCode.NOT_FOUND, "Playlist not found");
  }

  if (!playlist?.isOwnedBy(ownerId)) {
    throwError(HttpStatusCode.FORBIDDEN, "You can only update your own playlists");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        ...(name && { name }),
        ...(description && { description }),
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throwError(HttpStatusCode.INTERNAL_SERVER_ERROR, "Failed to update playlist");
  }

  return updatedPlaylist;
};

export const playlistService = {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
  searchPlaylists,
};

export default playlistService;
