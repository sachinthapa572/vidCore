import { Hono } from "hono";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import authMiddleware from "@/middlewares/is-authmiddleware";
import { tweetService } from "@/services/tweet.service";
import { sendSuccessResponse } from "@/utils/response.utils";
import { zCustomValidator } from "@/utils/zod-validator.utils";
import {
  createTweetSchema,
  getUserTweetsQuerySchema,
  pinTweetSchema,
  tweetIdParamSchema,
  updateTweetSchema,
  userIdParamSchema,
} from "@/validation/tweet.validation";

const tweetRouter = new Hono();

// Create tweet
tweetRouter.post("/", authMiddleware, zCustomValidator("json", createTweetSchema), async c => {
  const { content } = c.req.valid("json");
  const { _id: ownerId } = c.get("user");

  const tweet = await tweetService.createTweet({
    content,
    ownerId,
  });

  return sendSuccessResponse(c, tweet, "Tweet created successfully", HttpStatusCode.CREATED);
});

// Get user tweets
tweetRouter.get(
  "/user/:userId",
  authMiddleware,
  zCustomValidator("param", userIdParamSchema),
  zCustomValidator("query", getUserTweetsQuerySchema),
  async c => {
    const { userId } = c.req.valid("param");
    const { page, limit, sort } = c.req.valid("query");
    const { _id: currentUserId } = c.get("user");

    const tweets = await tweetService.getUserTweets({
      userId,
      page,
      limit,
      sort,
      currentUserId,
    });

    return sendSuccessResponse(c, tweets, "User tweets fetched successfully");
  }
);

// Update tweet
tweetRouter.patch(
  "/:tweetId",
  authMiddleware,
  zCustomValidator("param", tweetIdParamSchema),
  zCustomValidator("json", updateTweetSchema),
  async c => {
    const { tweetId } = c.req.valid("param");
    const { content } = c.req.valid("json");
    const { _id: ownerId } = c.get("user");

    const updatedTweet = await tweetService.updateTweet({
      tweetId,
      content,
      ownerId,
    });

    return sendSuccessResponse(c, updatedTweet, "Tweet updated successfully");
  }
);

// Delete tweet
tweetRouter.delete(
  "/:tweetId",
  authMiddleware,
  zCustomValidator("param", tweetIdParamSchema),
  async c => {
    const { tweetId } = c.req.valid("param");
    const { _id: ownerId } = c.get("user");

    const deletedTweet = await tweetService.deleteTweet({
      tweetId,
      ownerId,
    });

    return sendSuccessResponse(c, deletedTweet, "Tweet deleted successfully");
  }
);

// Pin/unpin tweet
tweetRouter.patch(
  "/pin/:tweetId",
  authMiddleware,
  zCustomValidator("param", tweetIdParamSchema),
  zCustomValidator("json", pinTweetSchema),
  async c => {
    const { tweetId } = c.req.valid("param");
    const { isPinned } = c.req.valid("json");
    const { _id: ownerId } = c.get("user");

    const updatedTweet = await tweetService.pinTweet({
      tweetId,
      ownerId,
      isPinned,
    });

    return sendSuccessResponse(
      c,
      updatedTweet,
      `Tweet ${isPinned ? 'pinned' : 'unpinned'} successfully`
    );
  }
);

export default tweetRouter;
