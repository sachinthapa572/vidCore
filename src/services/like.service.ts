import type { Types } from "mongoose";

import { Like } from "@/db/models/like.model";

const toggleVideoLike = async (videoId: string, userId: Types.ObjectId) => {
  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return { data: existingLike, action: "deleted" };
  }

  //   else create the new like
  const newLike = await Like.create({
    video: videoId,
    likedBy: userId,
  });
  return { data: newLike, action: "created" };
};

const toggleCommentLike = async (commentId: string, userId: Types.ObjectId) => {
  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return { data: existingLike, action: "unliked" };
  }

  //   else create the new like
  const newLike = await Like.create({
    comment: commentId,
    likedBy: userId,
  });
  return { data: newLike, action: "created" };
};

const toggleTweetLike = async (tweetId: string, userId: Types.ObjectId) => {
  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: userId,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return { data: existingLike, action: "unliked" };
  }

  //   else create the new like
  const newLike = await Like.create({
    tweet: tweetId,
    likedBy: userId,
  });
  return { data: newLike, action: "created" };
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
// $exist -> only retrive the those document that has the specified field
