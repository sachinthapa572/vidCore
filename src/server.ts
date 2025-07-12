import mongoose from "mongoose";

import { app, appEnv } from "./app/app";

export default {
  port: appEnv.PORT,
  fetch: app.fetch,
};

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully…");
  await mongoose.connection.close();
  process.exit(0);
});
