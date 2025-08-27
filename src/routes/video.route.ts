import { Hono } from "hono";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import authMiddleware from "@/middlewares/is-authmiddleware";
import { videoService } from "@/service/video.service";
import { sendSuccessResponse } from "@/utils/response.utils";
import { zCustomValidator } from "@/utils/zod-validator.utils";
import videoValidationSchema, {
  getAllVideosQuerySchema,
  idParamSchema,
  UpdateVideoValidationSchema,
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
    return sendSuccessResponse(c, videos, "Videos retrieved successfully");
  })
  .post("/", zCustomValidator("form", videoValidationSchema), async c => {
    const data = c.req.valid("form");
    const { _id } = c.get("user");
    const newVideo = await videoService.publishVideo({ ...data, owner: _id });
    console.log("to send the response the data has never come here ");

    return sendSuccessResponse(c, newVideo, "Video published successfully", HttpStatusCode.OK);
  })
  .get("/:id", zCustomValidator("param", idParamSchema), async c => {
    const videoId = c.req.param("id");
    const video = await videoService.getVideoById(videoId);
    return sendSuccessResponse(c, video, "Video retrieved successfully");
  })
  .get("/status/:id", zCustomValidator("param", idParamSchema), async c => {
    const videoId = c.req.param("id");
    const status = await videoService.getVideoStatus(videoId);
    return sendSuccessResponse(c, status, "Video status retrieved successfully");
  })
  .patch(
    "/:id",
    zCustomValidator("form", UpdateVideoValidationSchema),
    zCustomValidator("param", idParamSchema),
    async c => {
      const videoId = c.req.param("id");
      const data = c.req.valid("form");
      const updatedVideo = await videoService.updateVideo({ videoId, ...data });
      return sendSuccessResponse(c, updatedVideo, "Video updated successfully");
    }
  )
  .delete("/:id", zCustomValidator("param", idParamSchema), async c => {
    const videoId = c.req.param("id");
    await videoService.deleteVideo(videoId);
    return sendSuccessResponse(c, null, "Video deleted successfully");
  })
  .patch("/toggle/publish/:id", zCustomValidator("param", idParamSchema), async c => {
    const videoId = c.req.param("id");
    const video = await videoService.togglePublishStatus(videoId);
    return sendSuccessResponse(c, video, "Video publish status toggled successfully");
  })
  .patch("/cancel-delete/:id", zCustomValidator("param", idParamSchema), async c => {
    const videoId = c.req.param("id");
    const result = await videoService.cancelSoftDelete(videoId);
    return sendSuccessResponse(c, result, "Soft delete cancelled successfully");
  });

export default videoRouter;
