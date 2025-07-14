import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { videoService } from "@/service/video.service";
import { sendSuccessResponse } from "@/utils/response.utils";
import videoValidationSchema from "@/validation/video.validation";

const videoRouter = new Hono();

videoRouter.post("/", zValidator("form", videoValidationSchema), async c => {
  const data = c.req.valid("form");

  const newVideo = await videoService.createVideo(data);

  sendSuccessResponse(c, newVideo, "Video created successfully", HttpStatusCode.CREATED);
});

export default videoRouter;
