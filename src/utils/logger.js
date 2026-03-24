// src/utils/logger.js

export const logger = {
  info: (msg, data = null) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data || "");
  },

  error: (msg, err = null) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err || "");
  },

  warn: (msg) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`);
  },
};

import { logger } from "../utils/logger.js";

logger.info("User logged in", { userId: 1 });
logger.error("Payment failed", error);