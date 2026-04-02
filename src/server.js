import { app } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

async function start() {
  try {
    await connectDatabase();
    app.listen(env.port, env.host, () => {
      logger.info(`Backend running on http://${env.host}:${env.port}`);
    });
  } catch (error) {
    logger.error("Failed to start backend", error);
    process.exit(1);
  }
}

start();
