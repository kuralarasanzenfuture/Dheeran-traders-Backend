import express from "express";
import {
  getAgentStaffReport,
  getAssignedCustomerReport,
  getBatchReport,
  getCollectionReport,
  getCollectionReportDateRange,
  getCollectorPendingReport,
  getCustomerReport,
  getMonthlyCollectionReport,
  getPendingAndOverdueReport,
  getPlanReport,
} from "../../../controllers/chit/reports/chitReports.controller.js";

const router = express.Router();

// ✅ Batch Report Route (No Filters)
router.get("/batch-report", getBatchReport);

router.get("/agent-report", getAgentStaffReport);

router.get("/customer-report", getCustomerReport);

router.get("/plan-report", getPlanReport);

router.get("/assigned-customer-report", getAssignedCustomerReport);

router.get("/collection-report-date-range", getCollectionReportDateRange);

router.get("/collection-report", getCollectionReport);

router.get("/collection-report-monthly", getMonthlyCollectionReport);

router.get("/collection-report-Pending-Overdue", getPendingAndOverdueReport);

router.get("/collection-collector-pending-report", getCollectorPendingReport);

export default router;
