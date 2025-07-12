// auth.router.ts - Fixed version
import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { AuthService } from "@/service/auth.service";
import { cookiesOptions } from "@/utils/helper.utils";
import { sendSuccessResponse } from "@/utils/response.utils";
import { zCustomValidator } from "@/utils/zod-validator.utils";
import { userLoginSchema, userValidationSchema } from "@/validation/user.validation";

const userRouter = new Hono();

userRouter
  .post("/register", zCustomValidator("form", userValidationSchema), async c => {
    const data = c.req.valid("form");

    const result = await AuthService.registerUser(data);

    return sendSuccessResponse(c, result, "User registered successfully", HttpStatusCode.CREATED);
  })
  .post("/login", zCustomValidator("json", userLoginSchema), async c => {
    const data = c.req.valid("json");

    const result = await AuthService.loginUser(data);

    // Set cookies
    setCookie(c, "accessToken", result.refreshToken, cookiesOptions);
    setCookie(c, "refreshToken", result.refreshToken, cookiesOptions);

    return sendSuccessResponse(c, result, "Login successful", HttpStatusCode.OK);
  });

export default userRouter;
