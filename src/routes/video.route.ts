import { Hono } from "hono";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import authMiddleware from "@/middlewares/is-authmiddleware";
import { videoService } from "@/service/video.service";
import { sendSuccessResponse } from "@/utils/response.utils";
import { zCustomValidator } from "@/utils/zod-validator.utils";
import videoValidationSchema, {
  getAllVideosQuerySchema,
  idParamSchema,
} from "@/validation/video.validation";

const videoRouter = new Hono();

videoRouter
  .use(authMiddleware)
  .get("/", zCustomValidator("query", getAllVideosQuerySchema), async c => {
    const { page, limit, query, sortBy, sortType, userId } = c.req.valid("query");
    const videos = await videoService.getAllVideos({
      page,
      limit,
      query,
      sortBy,
      sortType,
      userId,
    });
    sendSuccessResponse(c, videos, "Videos retrieved successfully");
  })
  .post("/", zCustomValidator("form", videoValidationSchema), async c => {
    const data = c.req.valid("form");

    const newVideo = await videoService.publishVideo(data);

    sendSuccessResponse(c, newVideo, "Video published successfully", HttpStatusCode.CREATED);
  })
  .get("/:id", zCustomValidator("param", idParamSchema), async c => {
    const videoId = c.req.param("id");
    const video = await videoService.getVideoById(videoId);
    sendSuccessResponse(c, video, "Video retrieved successfully");
  })
  .patch(
    "/:id",
    zCustomValidator("form", videoValidationSchema),
    zCustomValidator("param", idParamSchema),
    async c => {
      const videoId = c.req.param("id");
      const data = c.req.valid("form");
      const updatedVideo = await videoService.updateVideo({ videoId, ...data });
      sendSuccessResponse(c, updatedVideo, "Video updated successfully");
    }
  )
  .delete("/:id", zCustomValidator("param", idParamSchema), async c => {
    const videoId = c.req.param("id");
    await videoService.deleteVideo(videoId);
    sendSuccessResponse(c, null, "Video deleted successfully");
  })
  .patch("/toggle/publish/:videoId", zCustomValidator("param", idParamSchema), async c => {
    const videoId = c.req.param("videoId");
    const video = await videoService.togglePublishStatus(videoId);
    sendSuccessResponse(c, video, "Video publish status toggled successfully");
  });

export default videoRouter;
