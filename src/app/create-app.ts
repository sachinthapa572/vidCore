import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { poweredBy } from "hono/powered-by";
import { prettyJSON } from "hono/pretty-json";

import type { envBinding } from "../db/env";

import serveEmojiFavicon from "../utils/serve-emoji-favicon";

export function createApp() {
  const app = new Hono<{ Bindings: envBinding }>({
    strict: true,
  }).basePath("/api/v1");

  app.use(logger()).use(prettyJSON()).use(serveEmojiFavicon("🪨"));

  // Add X-Response-Time header
  app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    c.header("X-Response-Time", `${ms}ms`);
  });

  app.use("*", poweredBy());

  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
      maxAge: 86400,
    }),
  );

  return app;
}
