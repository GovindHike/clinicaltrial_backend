import { app } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

function resolveListenHost(rawHost) {
  const fallbackHost = "0.0.0.0";
  const value = String(rawHost || "").trim();

  if (!value || value === "*") {
    return fallbackHost;
  }

  if (/^https?:\/\//i.test(value) || value.includes("/")) {
    logger.warn(`Ignoring invalid HOST value "${value}". Falling back to ${fallbackHost}.`);
    return fallbackHost;
  }

  if (value.includes(":")) {
    if (/^\[.*\]$/.test(value)) {
      return value.slice(1, -1);
    }
    if (!value.includes("::")) {
      return value.split(":")[0] || fallbackHost;
    }
  }

  return value;
}

async function start() {
  try {
    const listenHost = resolveListenHost(env.host);
    await connectDatabase();
    app.listen(env.port, listenHost, () => {
      logger.info(`Backend running on http://${listenHost}:${env.port}`);
    });
  } catch (error) {
    logger.error("Failed to start backend", error);
    process.exit(1);
  }
}

start();
