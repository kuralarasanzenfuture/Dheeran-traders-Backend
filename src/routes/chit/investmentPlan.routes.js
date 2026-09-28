import express from "express";
import {
  createInvestmentPlan,
  getAllInvestmentPlans,
  getInvestmentPlanById,
  updateInvestmentPlan,
  toggleInvestmentPlanStatus,
  deleteInvestmentPlan,
  previewInvestmentPlanCode,
} from "../../controllers/chit/investment/plan/investmentPlan.controller.js";
import { getInvestmentPlanAmountsByPlanId } from "../../controllers/chit/investment/planAmount/investmentPlanAmount.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Create plan
router.post("/create", createInvestmentPlan);
router.post("/", createInvestmentPlan);

// Preview auto-generated plan code
router.get("/preview-code", previewInvestmentPlanCode);

// Read plans
router.get("/", getAllInvestmentPlans);
router.get("/:id", getInvestmentPlanById);
router.get("/:plan_id/amounts", getInvestmentPlanAmountsByPlanId);

// Update plan
router.put("/:id", updateInvestmentPlan);
router.patch("/:id/status", toggleInvestmentPlanStatus);

// Delete plan
router.delete("/:id", deleteInvestmentPlan);

export default router;
