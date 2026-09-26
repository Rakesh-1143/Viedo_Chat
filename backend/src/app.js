import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.router.js";
import chatRoutes from "./routes/chat.route.js";
import { getAllowedOrigins } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

const normalizeOrigin = (origin) => origin?.replace(/\/$/, "");

export const createApp = () => {
  const app = express();
  const allowedOrigins = getAllowedOrigins();
  const allowedOriginSet = new Set(allowedOrigins.map(normalizeOrigin));

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy:
        process.env.NODE_ENV === "production"
          ? {
              directives: {
                defaultSrc: ["'self'"],
                connectSrc: [
                  "'self'",
                  "https://*.getstream.io",
                  "wss://*.getstream.io",
                  "https://*.stream-io-api.com",
                  "wss://*.stream-io-api.com",
                  "https://*.stream-io-video.com",
                  "wss://*.stream-io-video.com",
                ],
                imgSrc: ["'self'", "data:", "blob:", "https:"],
                mediaSrc: ["'self'", "blob:"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                workerSrc: ["'self'", "blob:"],
              },
            }
          : false,
    }),
  );
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOriginSet.has(normalizeOrigin(origin))) {
          return callback(null, true);
        }
        const error = new Error("Origin is not allowed");
        error.status = 403;
        return callback(error);
      },
    }),
  );
  app.use(express.json({ limit: "4mb" }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = normalizeOrigin(req.get("origin"));
    if (!origin || allowedOriginSet.has(origin)) return next();
    return res.status(403).json({ message: "Request origin is not allowed" });
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: process.env.NODE_ENV === "test" ? 1_000 : 180,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again shortly." },
  });

  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });
  app.use("/api", apiLimiter);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api", notFound);

  if (process.env.NODE_ENV === "production") {
    const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
    const frontendDirectory = path.resolve(currentDirectory, "../../frontend/dist");
    app.use(express.static(frontendDirectory));
    app.get("*", (req, res) => {
      res.sendFile(path.join(frontendDirectory, "index.html"));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
