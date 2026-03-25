import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import routes from "./routes/indexroutes.js";

// Middlewares
import { errorHandler } from "./middlewares/error.middleware.js";

import cookieParser from "cookie-parser";
import { startCleanupJob } from "./jobs/cleanupTokens.job.js";

// app.use(cookieParser());

// ------------------------------------------------------------------
// App & dirname setup (IMPORTANT for ES Modules)
// ------------------------------------------------------------------
const app = express();

// start cron job ONCE
startCleanupJob();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------------------------------------------
// Global Middlewares
// ------------------------------------------------------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------------
// Static Files
// ------------------------------------------------------------------
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// import { attachDb } from "./middleware/dbMiddleware.js";

// app.use(attachDb);
// router.get("/:role_id", attachDb, getRolePermissions);

// ------------------------------------------------------------------
// API Routes
// ------------------------------------------------------------------

app.use("/api", routes);


// ------------------------------------------------------------------
// Health Check (optional but recommended)
// ------------------------------------------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// ------------------------------------------------------------------
// Error Handler (ALWAYS LAST)
// ------------------------------------------------------------------
app.use(errorHandler);

export default app;