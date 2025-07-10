import type { ErrorHandler, NotFoundHandler } from "hono";
import type { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";
import type mongoose from "mongoose";

import type { envBinding } from "@/db/env";

import appEnv from "@/db/env";
import {
  BAD_REQUEST,
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,

} from "@/utils";
import { NOT_FOUND as NOT_FOUND_MESSAGE } from "@/utils/http-status-phrases";

// Error Handler
const errorHandler: ErrorHandler<{ Bindings: envBinding }> = (err, c) => {
  let statusCode: StatusCode = INTERNAL_SERVER_ERROR;
  let message = "Internal Server Error";

  if ("name" in err && err.name === "CastError") {
    statusCode = BAD_REQUEST;
    message = "Invalid resource ID";
  }
  else if ("name" in err && err.name === "ValidationError") {
    statusCode = BAD_REQUEST;
    const errors = Object.values((err as mongoose.Error.ValidationError).errors).map(
      el => el.message,
    );
    message = `Invalid input data. ${errors.join(". ")}`;
  }
  else if ("code" in err && err.code === 11000 && "keyValue" in err) {
    statusCode = CONFLICT;
    const field = Object.keys((err as any).keyValue)[0];
    const value = Object.values((err as any).keyValue)[0];
    message = `Duplicate field error: A document with ${field} '${value}' already exists.`;
  }
  else if ("status" in err) {
    statusCode = err.status as StatusCode;
    message = err.message;
  }

  const env = c.env.NODE_ENV || appEnv.NODE_ENV;

  return c.json(
    {
      success: false,
      message,
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
