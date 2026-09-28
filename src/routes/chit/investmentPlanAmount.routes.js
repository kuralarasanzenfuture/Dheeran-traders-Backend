import express from "express";
import {
  createInvestmentPlanAmount,
  getAllInvestmentPlanAmounts,
  getInvestmentPlanAmountById,
  getInvestmentPlanAmountsByPlanId,
  updateInvestmentPlanAmount,
  toggleInvestmentPlanAmountStatus,
  deleteInvestmentPlanAmount,
} from "../../controllers/chit/investment/planAmount/investmentPlanAmount.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Create plan amount
router.post("/create", createInvestmentPlanAmount);
router.post("/", createInvestmentPlanAmount);

// Read plan amounts
router.get("/", getAllInvestmentPlanAmounts);
router.get("/plan/:plan_id", getInvestmentPlanAmountsByPlanId);
router.get("/:id", getInvestmentPlanAmountById);

// Update plan amount
router.put("/:id", updateInvestmentPlanAmount);
router.patch("/:id/status", toggleInvestmentPlanAmountStatus);

// Delete plan amount
router.delete("/:id", deleteInvestmentPlanAmount);

export default router;
