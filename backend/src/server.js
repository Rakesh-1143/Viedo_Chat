import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./lib/db.js";
import { createApp } from "./app.js";
import { assertRequiredEnvironment } from "./config/env.js";

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    assertRequiredEnvironment();
    await connectDB();

    const app = createApp();
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    let isShuttingDown = false;
    const shutdown = (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`${signal} received. Closing HTTP server.`);
      const forceExit = setTimeout(() => {
        console.error("Graceful shutdown timed out.");
        process.exit(1);
      }, 10_000);
      forceExit.unref();

      server.close(async (serverError) => {
        let exitCode = serverError ? 1 : 0;
        try {
          await mongoose.disconnect();
        } catch (error) {
          exitCode = 1;
          console.error("MongoDB shutdown failed:", error.message);
        } finally {
          clearTimeout(forceExit);
          process.exit(exitCode);
        }
      });
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
