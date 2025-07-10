import type { ErrorHandler, NotFoundHandler } from "hono";
import type { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";

import type { envBinding } from "@/db/env";

import appEnv from "@/db/env";
import { INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from "@/utils";
import { NOT_FOUND as NOT_FOUND_MESSAGE } from "@/utils/http-status-phrases";

// Error Handler
const errorHandler: ErrorHandler<{ Bindings: envBinding }> = (err, c) => {
  const currentStatus
        = "status" in err ? err.status : c.newResponse(null).status;

  const statusCode = currentStatus !== OK
    ? (currentStatus as StatusCode)
    : INTERNAL_SERVER_ERROR;
  const env = c.env.NODE_ENV || appEnv.NODE_ENV;

  return c.json(
    {
      success: false,
      message: err?.message || "Internal Server Error",
      stack: env === "production" ? undefined : err?.stack,
    },
    statusCode as ContentfulStatusCode,
  );
};

// Not Found Handler
const notFound: NotFoundHandler = (c) => {
  return c.json(
    {
      success: false,
      message: `${NOT_FOUND_MESSAGE} - [${c.req.method}]:[${c.req.url}]`,
    },
    NOT_FOUND,
  );
};

export {
  errorHandler,
  notFound,
};
