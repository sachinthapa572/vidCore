import { app, appEnv } from "./app/app";

export default {
  port: appEnv.PORT,
  fetch: app.fetch,
};
