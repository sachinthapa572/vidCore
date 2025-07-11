import mongoose from "mongoose";

import appEnv from "./env";

async function dbConnect() {
  try {
    const dbClient = await mongoose.connect(appEnv.DATABASE_URL, {
      autoIndex: true,
    });
    // biome-ignore lint/suspicious/noConsole: for debugging purposes
    console.log(
      `\x1B[4m\x1B[92m[DB] [info] MongoDB connected! Database: ${dbClient.connection.name}\x1B[0m`
    );
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: for debugging purposes
    console.log(`\x1B[1m\x1B[4m\x1B[91m[DB][error] Error connecting to MongoDB: ${error}\x1B[0m`);
    process.exit(1);
  }
}

export default dbConnect;
