import express from "express";
import {
  getAgentStaffReport,
  getAssignedCustomerReport,
  getBatchReport,
  getCollectionReport,
  getCollectionReportDateRange,
  getCollectorPendingReport,
  getCollectorPerformance,
  getCustomerReport,
  getDailyAnalytics,
  getDashboard,
  getMobileDashboard,
  getMonthlyAnalytics,
  getMonthlyCollectionReport,
  getPendingAndOverdueReport,
  getPlanReport,
  getUserCollectionReport,
  getUserCollectionSummary,
  getRealtimeUserCollection,
  getUserCollectionById,
} from "../../../controllers/chit/reports/chitReports.controller.js";
import { verifyToken } from "../../../middlewares/auth.middleware.js";

const router = express.Router();

// ✅ Batch Report Route (No Filters)
router.get("/batch-report", getBatchReport);

router.get("/agent-report", getAgentStaffReport);

router.get("/customer-report", getCustomerReport);

router.get("/plan-report", getPlanReport);

router.get("/assigned-customer-report", getAssignedCustomerReport);

// 💰 Collection Reports
router.get("/collection-report-date-range", getCollectionReportDateRange);

router.get("/collection-report", getCollectionReport);

// 👤 User Collection Reports (Filters, Search & Realtime Optimized)
router.get("/user-collection-report", getUserCollectionReport);
router.get("/user-collection-summary", getUserCollectionSummary);
router.get("/user-collection-realtime", getRealtimeUserCollection);
router.get("/user-collection/:user_id", getUserCollectionById);

router.get("/collection-report-monthly", getMonthlyCollectionReport);

router.get("/collection-report-Pending-Overdue", getPendingAndOverdueReport);

router.get("/collection-collector-pending-report", getCollectorPendingReport);

// 👨‍💼 Collector Performance
router.get("/collector-performance", getCollectorPerformance);

// 📅 Daily Analytics
router.get("/daily-analytics", getDailyAnalytics);

// 📅 Monthly Analytics
router.get("/monthly-analytics", getMonthlyAnalytics);

// 📊 Dashboard
router.get("/dashboard", getDashboard);

router.get("/mobile-dashboard", verifyToken, getMobileDashboard);

export default router;
