import { Hono } from "hono";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import authMiddleware from "@/middlewares/is-authmiddleware";
import { likeService } from "@/services/like.service";
import { sendSuccessResponse } from "@/utils/response.utils";
import { zCustomValidator } from "@/utils/zod-validator.utils";
import { idParamSchema } from "@/validation/video.validation";

const likeRouter = new Hono();

likeRouter
  .use(authMiddleware)
  .post("/toggle/v/:id", zCustomValidator("param", idParamSchema), async c => {
    const videoId = c.req.param("id");
    const userId = c.get("user")._id;
    const response = await likeService.toggleVideoLike(videoId, userId);
    return sendSuccessResponse(
      c,
      response.data,
      `Video ${response.action} successfully`,
      HttpStatusCode.ACCEPTED
    );
  })
  .post("/toggle/c/:id", zCustomValidator("param", idParamSchema), async c => {
    const commentId = c.req.param("id");
    const userId = c.get("user")._id;
    const response = await likeService.toggleCommentLike(commentId, userId);
    return sendSuccessResponse(
      c,
      response.data,
      `Comment ${response.action} successfully`,
      HttpStatusCode.ACCEPTED
    );
  })
  .post("/toggle/t/:id", zCustomValidator("param", idParamSchema), async c => {
    const tweetId = c.req.param("id");
    const userId = c.get("user")._id;
    const response = await likeService.toggleTweetLike(tweetId, userId);
    return sendSuccessResponse(
      c,
      response.data,
      `Tweet ${response.action} successfully`,
      HttpStatusCode.ACCEPTED
    );
  })
  .get("/videos", async c => {
    const userId = c.get("user")._id;
    const likedVideos = await likeService.getLikedVideos(userId);
    return sendSuccessResponse(
      c,
      likedVideos,
      "Liked videos retrieved successfully",
      HttpStatusCode.OK
    );
  });
