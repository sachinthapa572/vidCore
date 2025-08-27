import type { Types } from "mongoose";

import { Like } from "@/db/models/like.model";

const toggleLike = async (criteria: Record<string, string>, userId: Types.ObjectId) => {
  const query = { ...criteria, likedBy: userId };
  const existingLike = await Like.findOne(query);

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return { data: existingLike, action: "unliked" };
  }

  //   else create the new like
  const newLike = await Like.create(query);
  return { data: newLike, action: "created" };
};

const toggleVideoLike = async (videoId: string, userId: Types.ObjectId) => {
  return toggleLike({ video: videoId }, userId);
};

const toggleCommentLike = async (commentId: string, userId: Types.ObjectId) => {
  return toggleLike({ comment: commentId }, userId);
};

const toggleTweetLike = async (tweetId: string, userId: Types.ObjectId) => {
  return toggleLike({ tweet: tweetId }, userId);
};
const getLikedVideos = async (userId: Types.ObjectId) => {
  const likedVideos = await Like.find({ likedBy: userId, video: { $exists: true, $ne: null } })
    .populate<{ video: { _id: Types.ObjectId; title: string; url: string } }>(
      "video",
      "_id title url"
    )
    .exec();
  return likedVideos;
};

export const likeService = {
  toggleVideoLike,
  toggleCommentLike,
  toggleTweetLike,
  getLikedVideos,
};

// helps-command
// $exists -> only retrieve those documents that have the specified field
