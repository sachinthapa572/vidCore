// auth.router.ts - Fixed version

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import authMiddleware from "@/middlewares/is-authmiddleware";
import { AuthService } from "@/service/auth.service";
import { throwError } from "@/utils/api-error";
import { cookiesOptions } from "@/utils/helper.utils";
import { sendSuccessResponse } from "@/utils/response.utils";
import { zCustomValidator } from "@/utils/zod-validator.utils";
import {
  updateImageschema,
  updatePasswordSchema,
  userLoginSchema,
  userValidationSchema,
} from "@/validation/user.validation";

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
  })
  // authenticated routes
  .use(authMiddleware)
  .post("/logout", async c => {
    const user = c.get("user");
    await AuthService.logoutUser(user._id);
    // Clear cookies on logout
    deleteCookie(c, "accessToken");
    deleteCookie(c, "refreshToken");

    return sendSuccessResponse(c, null, "Logout successful", HttpStatusCode.OK);
  })
  .post("/refresh-token", async c => {
    const refreshToken =
      c.req.header("Authorization")?.replace("Bearer ", "") || getCookie(c, "refreshToken");

    if (!refreshToken) {
      return throwError(HttpStatusCode.UNAUTHORIZED, "Refresh token is required");
    }

    const result = await AuthService.refreshToken(refreshToken);

    // Set new cookies
    setCookie(c, "accessToken", result.accessToken, cookiesOptions);
    setCookie(c, "refreshToken", result.refreshToken, cookiesOptions);
    return sendSuccessResponse(c, result, "Token refreshed successfully", HttpStatusCode.OK);
  })
  .get("/current-user", async c => {
    const user = c.get("user");
    return sendSuccessResponse(c, user, "User profile retrieved successfully", HttpStatusCode.OK);
  })
  .post("/change-password", zCustomValidator("json", updatePasswordSchema), async c => {
    const user = c.get("user");
    const { oldPassword, newPassword } = c.req.valid("json");

    await AuthService.updatePassword({
      userId: user._id,
      oldPassword,
      newPassword,
    });

    return sendSuccessResponse(c, null, "Password updated successfully", HttpStatusCode.OK);
  })
  .patch("/update-image", zValidator("form", updateImageschema), async c => {
    const data = c.req.valid("form");
    const user = c.get("user");
    const result = await AuthService.updateImage(data, user._id);

    return sendSuccessResponse(c, result, "Image Update Sucessfully", HttpStatusCode.OK);
  });

export default userRouter;
