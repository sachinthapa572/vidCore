import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";

import type { envBinding } from "@/db/env";
import appEnv from "@/db/env";
import { HttpStatusCode, HttpStatusPhrase } from "@/enum/http-status-codes.enum";
import type {
  CustomErrorInfo,
  ErrorResponse,
  HttpError,
  MongoCastError,
  MongoDuplicateKeyError,
  MongoValidationError,
} from "@/types/error.type";

// Type guards with enhanced error detection
const isMongoValidationError = (err: unknown): err is MongoValidationError =>
  err instanceof Error && "name" in err && err.name === "ValidationError";

const isMongoCastError = (err: unknown): err is MongoCastError =>
  err instanceof Error && "name" in err && err.name === "CastError";

const isMongoDuplicateKeyError = (err: unknown): err is MongoDuplicateKeyError =>
  err instanceof Error && "code" in err && (err as MongoDuplicateKeyError).code === 11000;

const isHttpException = (err: unknown): err is HTTPException => err instanceof HTTPException;

const isHttpError = (err: unknown): err is HttpError =>
  err instanceof Error && "status" in err && typeof (err as HttpError).status === "number";

// Helper function to get HTTP phrase
const getHttpPhrase = (code: StatusCode): string => {
  const statusKey = Object.keys(HttpStatusCode).find(
    key => HttpStatusCode[key as keyof typeof HttpStatusCode] === code
  );
  return statusKey ? HttpStatusPhrase[statusKey as keyof typeof HttpStatusPhrase] : "Unknown Error";
};

// Helper function to parse custom error information
const parseCustomErrorInfo = (err: HTTPException): CustomErrorInfo => {
  try {
    if (typeof err.message === "string") {
      try {
        // Try to parse the message as JSON first
        return JSON.parse(err.message);
      } catch {
        // If not JSON, check if there's a getResponse method (Hono specific)
        // biome-ignore lint/suspicious/noExplicitAny: dont know how to type this
        if (typeof (err as any).getResponse === "function") {
          // biome-ignore lint/suspicious/noExplicitAny: dont know how to type this
          const response = (err as any).getResponse();
          return {
            message: response.message || err.message,
            code: response.code,
          };
        }
        // Fallback to simple message
        return { message: err.message };
      }
    }
    return { message: "Unknown error" };
  } catch {
    return { message: err.message || "Unknown error" };
  }
};

// Error Handler
const errorHandler: ErrorHandler<{ Bindings: envBinding }> = (err, c) => {
  console.error("❌ Error occurred:", {
    // error: err,
    stack: err?.stack,
    url: c.req.url,
    method: c.req.method,
  });

  const statusCode = (() => {
    if (isHttpException(err)) return err.status as StatusCode;
    if (isMongoCastError(err)) return HttpStatusCode.BAD_REQUEST;
    if (isMongoValidationError(err)) return HttpStatusCode.BAD_REQUEST;
    if (isMongoDuplicateKeyError(err)) return HttpStatusCode.CONFLICT;
    if (isHttpError(err)) return err.status as StatusCode;
    return HttpStatusCode.INTERNAL_SERVER_ERROR;
  })();

  const response: ErrorResponse = {
    success: false,
    message: "Internal Server Error",
    timestamp: new Date().toISOString(),
    path: c.req.path,
    method: c.req.method,
  };

  const env = c.env.NODE_ENV || appEnv.NODE_ENV;

  try {
    if (isHttpException(err)) {
      if (err.cause === "ZodError") {
        try {
          response.message = JSON.parse(err.message);
          response.code = "VALIDATION_ERROR";
        } catch {
          response.message = "Invalid input data";
          response.code = "INVALID_INPUT";
        }
      } else {
        // Handle custom error information
        const errorInfo = parseCustomErrorInfo(err);
        response.message = errorInfo.message;
        response.code = errorInfo.code || getDefaultErrorCode(statusCode);
      }
    } else if (isMongoCastError(err)) {
      response.message = `Invalid ${err.kind} for field '${err.path}'`;
      response.code = "INVALID_ID";
    } else if (isMongoValidationError(err)) {
      response.message = "Validation failed";
      response.code = "MONGO_VALIDATION_ERROR";
    } else if (isMongoDuplicateKeyError(err)) {
      const [field, value] = Object.entries(err.keyValue)[0] || ["unknown", "unknown"];
      response.message = `Duplicate field error: A document with ${field} '${value}' already exists`;
      response.code = "DUPLICATE_KEY";
    } else if (isHttpError(err)) {
      response.message = err.message;
      response.code = getDefaultErrorCode(err.status as StatusCode);
    }

    // Add stack trace in development
    if (env === "development" && err?.stack) {
      response.stack = err.stack;
    }

    // Ensure message is never empty
    if (
      !response.message ||
      (typeof response.message === "string" && response.message.trim() === "") ||
      (typeof response.message === "object" && Object.keys(response.message).length === 0)
    ) {
      response.message = getHttpPhrase(statusCode);
    }

    return c.json(response, statusCode as ContentfulStatusCode);
  } catch (handlerError) {
    // Fallback error handler in case something goes wrong in our error handling
    console.error("❌ Error in error handler:", handlerError);
    return c.json(
      {
        success: false,
        message: "An unexpected error occurred while processing the error",
        timestamp: new Date().toISOString(),
        code: "ERROR_HANDLER_FAILURE",
      },
      HttpStatusCode.INTERNAL_SERVER_ERROR
    );
  }
};

// Helper function to get default error code based on status code
const getDefaultErrorCode = (status: StatusCode): string => {
  switch (status) {
    case HttpStatusCode.BAD_REQUEST:
      return "BAD_REQUEST";
    case HttpStatusCode.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatusCode.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatusCode.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatusCode.CONFLICT:
      return "CONFLICT";
    case HttpStatusCode.UNPROCESSABLE_ENTITY:
      return "UNPROCESSABLE_ENTITY";
    case HttpStatusCode.TOO_MANY_REQUESTS:
      return "TOO_MANY_REQUESTS";
    case HttpStatusCode.INTERNAL_SERVER_ERROR:
      return "INTERNAL_SERVER_ERROR";
    default:
      return "UNKNOWN_ERROR";
  }
};

// Enhanced Not Found Handler
const notFoundHandler: NotFoundHandler = c => {
  const response: ErrorResponse = {
    success: false,
    message: `${HttpStatusPhrase.NOT_FOUND} - [${c.req.method}]:[${c.req.url}]`,
    timestamp: new Date().toISOString(),
    path: c.req.path,
    method: c.req.method,
    code: "NOT_FOUND",
  };

  return c.json(response, HttpStatusCode.NOT_FOUND);
};

export { errorHandler, notFoundHandler };
