import express from "express";
import {
  getMonthlyInvestmentDueSchedules,
  getMonthlyInvestmentDueSummary,
  getAllMonthlyInvestmentSchedules,
  getMonthlyInvestmentScheduleById,
  getSchedulesBySubscriptionId,
  runDailyMonthlyInvestmentMaintenance,
} from "../../controllers/chit/monthly-investment/schedule/monthlyInvestmentSchedule.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// =========================================================================
// DUE PAYMENTS & PRESET APIS (TODAY DUE, OVERDUE, UPCOMING, SUMMARY)
// =========================================================================
// 1. Today's Due Payouts (interest_due_date = CURDATE())
router.get("/due/today", (req, res) => getMonthlyInvestmentDueSchedules(req, res, "today"));

// 2. Overdue Payouts (interest_due_date < CURDATE() AND unpaid)
router.get("/due/overdue", (req, res) => getMonthlyInvestmentDueSchedules(req, res, "overdue"));

// 3. Upcoming Payouts (interest_due_date > CURDATE())
router.get("/due/upcoming", (req, res) => getMonthlyInvestmentDueSchedules(req, res, "upcoming"));

// 4. Aggregated Due Metrics for Dashboard / KPI Cards
router.get("/due/summary", getMonthlyInvestmentDueSummary);

// 5. General Due Payments API with all filters (date_filter, customer_id, area_id, plan_id, etc.)
router.get("/due", (req, res) => getMonthlyInvestmentDueSchedules(req, res, req.query.due_type || req.query.date_filter || "all"));

// =========================================================================
// STANDARD SCHEDULE APIS & MAINTENANCE
// =========================================================================
// Maintenance action (Rule 15 - can be called by cron or admin)
router.post("/maintain", runDailyMonthlyInvestmentMaintenance);

// Schedules by subscription ID
router.get("/subscription/:subscription_id", getSchedulesBySubscriptionId);

// Single schedule by ID
router.get("/:id", getMonthlyInvestmentScheduleById);

// All schedules with general filters and date_filter presets
router.get("/", getAllMonthlyInvestmentSchedules);

export default router;
