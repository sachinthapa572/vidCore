import { errorHandler, notFoundHandler } from "@/middlewares/error.middlewares";
import userRouter from "@/routes/user.route";

import dbConnect from "../db/database.config";
import appEnv from "../db/env";
import { createApp } from "./create-app";

const app = createApp();

// Config MongoDB - Only connect if not in Cloudflare Workers environment
if (typeof process !== "undefined") {
  dbConnect();
}

app.get("/", c => {
  return c.json({ message: "Hello Hono!" }, 200);
});

app.route("/users/", userRouter);

app.onError(errorHandler);
app.notFound(notFoundHandler);

export { app, appEnv };
