import type { Context } from "hono";
import { Hono } from "hono";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import authMiddleware from "@/middlewares/is-authmiddleware";
import { likeService } from "@/services/like.service";
import { sendSuccessResponse } from "@/utils/response.utils";
import { zCustomValidator } from "@/utils/zod-validator.utils";
import { idParamSchema } from "@/validation/video.validation";

const likeRouter = new Hono();
const createToggleHandler =
  (
    entityName: "Video" | "Comment" | "Tweet",
    serviceMethod: (id: string, userId: any) => Promise<{ data: any; action: string }>
  ) =>
  async (c: Context) => {
    const id = c.req.param("id");
    const userId = c.get("user")._id;
    const response = await serviceMethod(id, userId);
    return sendSuccessResponse(
      c,
      response.data,
      `${entityName} ${response.action} successfully`,
      HttpStatusCode.ACCEPTED
    );
  };

likeRouter
  .use(authMiddleware)
  .post(
    "/toggle/v/:id",
    zCustomValidator("param", idParamSchema),
    createToggleHandler("Video", likeService.toggleVideoLike)
  )
  .post(
    "/toggle/c/:id",
    zCustomValidator("param", idParamSchema),
    createToggleHandler("Comment", likeService.toggleCommentLike)
  )
  .post(
    "/toggle/t/:id",
    zCustomValidator("param", idParamSchema),
    createToggleHandler("Tweet", likeService.toggleTweetLike)
  )
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

export default likeRouter;
