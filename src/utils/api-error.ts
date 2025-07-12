import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const throwError = (status: ContentfulStatusCode, message: string, code?: string): never => {
  throw new HTTPException(status, {
    message: JSON.stringify({ message, code }),
  });
};
