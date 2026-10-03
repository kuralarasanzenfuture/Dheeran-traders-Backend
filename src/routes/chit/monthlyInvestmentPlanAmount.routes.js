import express from "express";
import {
  createMonthlyInvestmentPlanAmount,
  getAllMonthlyInvestmentPlanAmounts,
  getMonthlyInvestmentPlanAmountById,
  getMonthlyInvestmentPlanAmountsByPlanId,
  updateMonthlyInvestmentPlanAmount,
  toggleMonthlyInvestmentPlanAmountStatus,
  deleteMonthlyInvestmentPlanAmount,
} from "../../controllers/chit/monthly-investment/plan-amount/monthlyInvestmentPlanAmount.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Create plan amount
router.post("/create", createMonthlyInvestmentPlanAmount);
router.post("/", createMonthlyInvestmentPlanAmount);

// Read plan amounts
router.get("/", getAllMonthlyInvestmentPlanAmounts);
router.get("/plan/:plan_id", getMonthlyInvestmentPlanAmountsByPlanId);
router.get("/:id", getMonthlyInvestmentPlanAmountById);

// Update plan amount
router.put("/:id", updateMonthlyInvestmentPlanAmount);
router.patch("/:id/status", toggleMonthlyInvestmentPlanAmountStatus);

// Delete plan amount
router.delete("/:id", deleteMonthlyInvestmentPlanAmount);

export default router;
