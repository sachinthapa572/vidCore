import type { ErrorHandler, NotFoundHandler } from "hono";
import type { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";
import type mongoose from "mongoose";

import type { envBinding } from "@/db/env";
import appEnv from "@/db/env";
import { BAD_REQUEST, CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND } from "@/utils/http-status-codes";
import { NOT_FOUND as NOT_FOUND_MESSAGE } from "@/utils/http-status-phrases";

// Type definitions for error handling
type MongoValidationError = mongoose.Error.ValidationError;
type MongoCastError = mongoose.Error.CastError;
type MongoDuplicateKeyError = Error & {
  code: number;
  keyValue: Record<string, unknown>;
};
type HttpError = Error & { status: number };

// Type guards
const isMongoValidationError = (err: unknown): err is MongoValidationError =>
  err instanceof Error && "name" in err && err.name === "ValidationError";

const isMongoCastError = (err: unknown): err is MongoCastError =>
  err instanceof Error && "name" in err && err.name === "CastError";

const isMongoDuplicateKeyError = (err: unknown): err is MongoDuplicateKeyError =>
  err instanceof Error && "code" in err && (err as MongoDuplicateKeyError).code === 11000;

const isHttpError = (err: unknown): err is HttpError =>
  err instanceof Error && "status" in err && typeof (err as HttpError).status === "number";

// Error Handler
const errorHandler: ErrorHandler<{ Bindings: envBinding }> = (err, c) => {
  // biome-ignore lint/suspicious/noConsole: for debugging purposes
  console.log("❌❌❌Error occurred:", err);
  let statusCode: StatusCode = INTERNAL_SERVER_ERROR;
  let message = "Internal Server Error";
  const env = c.env.NODE_ENV || appEnv.NODE_ENV;

  if (isMongoCastError(err)) {
    statusCode = BAD_REQUEST;
    message = "Invalid resource ID";
  } else if (isMongoValidationError(err)) {
    statusCode = BAD_REQUEST;
    const errors = Object.values(err.errors).map(el => el.message);
    message = `Invalid input data. ${errors.join(". ")}`;
  } else if (isMongoDuplicateKeyError(err)) {
    statusCode = CONFLICT;
    const [field, value] = Object.entries(err.keyValue)[0] || ["unknown", "unknown"];
    message = `Duplicate field error: A document with ${field} '${value}' already exists.`;
  } else if (isHttpError(err)) {
    statusCode = err.status as StatusCode;
    message = err.message;
  }

  return c.json(
    {
      success: false,
      message,
      stack: env === "production" ? undefined : err?.stack,
    },
    statusCode as ContentfulStatusCode
  );
};

// Not Found Handler (remains the same)
const notFoundHandler: NotFoundHandler = c => {
  return c.json(
    {
      success: false,
      message: `${NOT_FOUND_MESSAGE} - [${c.req.method}]:[${c.req.url}]`,
    },
    NOT_FOUND
  );
};

export { errorHandler, notFoundHandler };
