import cors from "cors";
import express from "express";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

function normalizeOrigin(origin) {
  if (!origin) return "";
  return String(origin).trim().replace(/\/+$/, "").toLowerCase();
}

function isLocalOrPrivateHost(hostname = "") {
  const host = String(hostname).toLowerCase();
  if (["localhost", "127.0.0.1", "::1"].includes(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAllowedOrigin(origin, allowList) {
  if (allowList.includes(origin)) {
    return true;
  }

  return allowList.some((allowedOrigin) => {
    if (!allowedOrigin.includes("*")) {
      return false;
    }

    const pattern = `^${escapeRegex(allowedOrigin).replace(/\\\*/g, ".*")}$`;
    return new RegExp(pattern, "i").test(origin);
  });
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.corsOrigins === "*") {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);

      if (isAllowedOrigin(normalizedOrigin, env.corsOrigins)) {
        callback(null, true);
        return;
      }

      try {
        const parsed = new URL(normalizedOrigin);
        if (isLocalOrPrivateHost(parsed.hostname)) {
          callback(null, true);
          return;
        }
      } catch {
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "evidencerx-india-backend" });
});

app.use("/api", recommendationRoutes);
app.use(errorHandler);
