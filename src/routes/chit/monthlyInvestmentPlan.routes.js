import express from "express";
import {
  createMonthlyInvestmentPlan,
  getAllMonthlyInvestmentPlans,
  getMonthlyInvestmentPlanById,
  updateMonthlyInvestmentPlan,
  toggleMonthlyInvestmentPlanStatus,
  deleteMonthlyInvestmentPlan,
  previewMonthlyInvestmentPlanCode,
  getMonthlyInvestmentPlanOptions,
} from "../../controllers/chit/monthly-investment/plan/monthlyInvestmentPlan.controller.js";
import { getMonthlyInvestmentPlanAmountsByPlanId } from "../../controllers/chit/monthly-investment/plan-amount/monthlyInvestmentPlanAmount.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Create plan
router.post("/create", createMonthlyInvestmentPlan);
router.post("/", createMonthlyInvestmentPlan);

// Preview auto-generated plan code & options metadata
router.get("/preview-code", previewMonthlyInvestmentPlanCode);
router.get("/options", getMonthlyInvestmentPlanOptions);
router.get("/interest-payment-days", getMonthlyInvestmentPlanOptions);

// Read plans
router.get("/", getAllMonthlyInvestmentPlans);
router.get("/:id", getMonthlyInvestmentPlanById);
router.get("/:plan_id/amounts", getMonthlyInvestmentPlanAmountsByPlanId);

// Update plan
router.put("/:id", updateMonthlyInvestmentPlan);
router.patch("/:id/status", toggleMonthlyInvestmentPlanStatus);

// Delete plan
router.delete("/:id", deleteMonthlyInvestmentPlan);

export default router;
