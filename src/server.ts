import mongoose from "mongoose";

import { app, appEnv } from "./app/app";

export default {
  port: appEnv.PORT,
  fetch: app.fetch,
};

console.log(`[Agenda][info] Agenda Ui DashBoard http://localhost:${appEnv.PORT}/api/v1/agenda/ui`);

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully…");
  await mongoose.connection.close();
  process.exit(0);
});
