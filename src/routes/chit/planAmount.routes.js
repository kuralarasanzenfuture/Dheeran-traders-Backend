import express from "express";
import {
  createPlanAmount,
  getAllPlanAmounts,
  getPlanAmountById,
  getPlanAmountsByPlanId,
  updatePlanAmount,
  togglePlanAmountStatus,
  deletePlanAmount,
} from "../../controllers/chit/planAmount.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Create plan amount
router.post("/create", createPlanAmount);
router.post("/", createPlanAmount);

// Read plan amounts
router.get("/", getAllPlanAmounts);
router.get("/plan/:plan_id", getPlanAmountsByPlanId);
router.get("/:id", getPlanAmountById);

// Update plan amount
router.put("/:id", updatePlanAmount);
router.patch("/:id/status", togglePlanAmountStatus);

// Delete plan amount
router.delete("/:id", deletePlanAmount);

export default router;
