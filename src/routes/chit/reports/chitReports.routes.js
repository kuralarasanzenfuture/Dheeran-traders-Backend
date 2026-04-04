import express from "express";
import { getAgentStaffReport, getBatchReport, getCustomerReport, getPlanReport } from "../../../controllers/chit/reports/chitReports.controller.js";

const router = express.Router();

// ✅ Batch Report Route (No Filters)
router.get("/batch-report", getBatchReport);

router.get("/agent-report", getAgentStaffReport);

router.get('/customer-report', getCustomerReport);

router.get('/plan-report', getPlanReport);

export default router;
