import express from "express";
import {
  getSchedulesBySubscriptionId,
  getScheduleById,
  updateScheduleInterestAmount,
  bulkUpdateScheduleStatus,
  getUpcomingDueSchedules,
} from "../../controllers/chit/investment/schedule/investmentSchedule.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Due schedules for weekly processing & filtering
router.get("/due/today", (req, res, next) => getUpcomingDueSchedules(req, res, "today"));
router.get("/due/overdue", (req, res, next) => getUpcomingDueSchedules(req, res, "overdue"));
router.get("/due/upcoming", (req, res, next) => getUpcomingDueSchedules(req, res, "upcoming"));
router.get("/due", getUpcomingDueSchedules);

// Schedules by subscription ID
router.get("/subscription/:subscription_id", getSchedulesBySubscriptionId);

// Single schedule by ID
router.get("/:id", getScheduleById);

// Update interest amount (dynamic)
router.patch("/:id/interest", updateScheduleInterestAmount);

// Bulk approve / update status
router.patch("/bulk-status", bulkUpdateScheduleStatus);

export default router;
