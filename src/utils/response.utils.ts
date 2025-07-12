import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { HttpStatusCode } from "@/enum/http-status-codes.enum";

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  timestamp: string;
  path?: string;
  method?: string;
}

// Global success response sender
export const sendSuccessResponse = <T>(
  c: Context,
  data: T,
  message?: string,
  statusCode: ContentfulStatusCode = HttpStatusCode.OK
) => {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };

  return c.json(response, statusCode);
};

// Global error response sender (similar to throwError but for direct responses)
export const sendErrorResponse = (
  c: Context,
  message: string,
  statusCode: ContentfulStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR,
  code?: string
) => {
  const response: ErrorResponse = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
    path: c.req.path,
    method: c.req.method,
  };

  return c.json(response, statusCode);
};
