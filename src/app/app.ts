import dbConnect from "../db/database.config";
import appEnv from "../db/env";
import { errorHandler, notFound } from "../middlewares";
import { createApp } from "./create-app";

const app = createApp();

// Config MongoDB - Only connect if not in Cloudflare Workers environment
if (typeof process !== "undefined") {
  dbConnect();
}

app.get("/", (c) => {
  return c.json({ message: "Hello Hono!" }, 200);
});

app.onError(errorHandler);
app.notFound(notFound);

export { app, appEnv };
