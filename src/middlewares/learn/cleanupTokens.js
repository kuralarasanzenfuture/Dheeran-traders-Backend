// cleanup function
const cleanupTokens = async () => {
  try {
    console.log("Running token cleanup...");

    await db.query(`
      UPDATE user_refresh_tokens
      SET is_active = 0
      WHERE expires_at < NOW()
    `);

    await db.query(`
      DELETE FROM user_refresh_tokens
      WHERE expires_at < NOW()
    `);

    console.log("Cleanup done");
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
};

export const startCleanupJob = () => {

  // ✅ RUN ON START
  cleanupTokens();

  // ⏰ RUN EVERY HOUR
  cron.schedule("0 * * * *", cleanupTokens);
//   cron.schedule("*/15 * * * *", cleanupTokens); //runs every 15 minutes
};