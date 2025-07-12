import { zValidator as zv } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod/v4";

export const zCustomValidator = <T extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T
) =>
  zv(target, schema, (result, _c) => {
    if (!result.success) {
      const errorMap = result.error.issues.reduce(
        (acc, issue) => {
          const key = issue.path.join(".");
          acc[key] = issue.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw new HTTPException(400, {
        cause: result.error.name,
        message: JSON.stringify(errorMap),
      });
    }
  });
