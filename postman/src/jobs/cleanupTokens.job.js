// src/jobs/cleanupTokens.job.js

import cron from "node-cron";
import db from "../config/db.js";

export const startCleanupJob = () => {
  // every hour
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("Running token cleanup job...");

      // step 1: mark expired inactive
      await db.query(`
        UPDATE user_refresh_tokens
        SET is_active = 0
        WHERE expires_at < NOW()
      `);

      // step 2: delete expired tokens
      await db.query(`
        DELETE FROM user_refresh_tokens
        WHERE expires_at < NOW()
      `);

      console.log("Token cleanup completed");
    } catch (err) {
      console.error("Cleanup job failed:", err.message);
    }
  });
};