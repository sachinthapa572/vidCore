import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { type JwtVariables, jwt } from "hono/jwt";
import { Types } from "mongoose";
import { z } from "zod/v4";

import appEnv from "@/db/env";
import { User } from "@/db/models/user.model";
import { HttpStatusCode } from "@/enum/http-status-codes.enum";
import { throwError } from "@/utils/api-error";
import { formatUserProfile, type UserProfile } from "@/utils/helper.utils";

// Define JWT payload schema
const JwtPayloadSchema = z.object({
  userId: z.string().transform(val => new Types.ObjectId(val)),
});

type Variables = JwtVariables & {
  user: UserProfile;
};

const authMiddleware = createMiddleware(
  async (
    c: Context<{
      Variables: Variables;
    }>,
    next
  ) => {
    const fetchUserMiddleware = async (c: Context<{ Variables: Variables }>, next: Next) => {
      try {
        const payload = c.get("jwtPayload");

        console.log("JWT Payload:", payload);

        if (!payload) {
          return throwError(
            HttpStatusCode.UNAUTHORIZED,
            "JWT payload is missing",
            "JWT_PAYLOAD_MISSING"
          );
        }

        // Validate payload
        const parsedPayload = JwtPayloadSchema.safeParse(payload);
        if (!parsedPayload.success) {
          return throwError(
            HttpStatusCode.UNAUTHORIZED,
            "Invalid JWT payload",
            "INVALID_JWT_PAYLOAD"
          );
        }

        // fetch the user from the database
        const user = await User.findById(parsedPayload.data.userId).exec();

        if (!user) {
          return throwError(HttpStatusCode.UNAUTHORIZED, "User not found");
        }

        //   format the daata
        const userProfile = formatUserProfile(user);

        c.set("user", userProfile);
        await next();
      } catch (error) {
        console.error("Error in fetchUserMiddleware:", error);
        if (!(error instanceof throwError || error instanceof z.ZodError)) {
          return throwError(
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            "Internal server error",
            "INTERNAL_SERVER_ERROR"
          );
        }
      }
    };

    const jwtMiddleware = jwt({
      secret: appEnv.JWT_SECRET,
      cookie: {
        key: "refreshToken",
      },
      headerName: "Authorization",
    });

    await jwtMiddleware(c, async () => {
      console.log("JWT Middleware passed, now fetching user...");
      await fetchUserMiddleware(c, next);
    });
  }
);

export default authMiddleware;
