import type mongoose from "mongoose";

// Type definitions for error handling
export type MongoValidationError = mongoose.Error.ValidationError;
export type MongoCastError = mongoose.Error.CastError;
export type MongoDuplicateKeyError = Error & {
  code: number;
  keyValue: Record<string, unknown>;
};
export type HttpError = Error & { status: number };

export type CustomErrorInfo = {
  message: string;
  code?: string;
};

export type ErrorResponse = {
  success: false;
  message: string;
  code?: string;
  stack?: string;
  timestamp: string;
  path?: string;
  method?: string;
};
