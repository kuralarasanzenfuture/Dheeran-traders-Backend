import express from "express";
import {
  createInvestmentSubscription,
  getAllInvestmentSubscriptions,
  getInvestmentSubscriptionById,
  updateInvestmentSubscription,
  deleteInvestmentSubscription,
} from "../../controllers/chit/investment/subscription/investmentSubscription.controller.js";
import { getSchedulesBySubscriptionId } from "../../controllers/chit/investment/schedule/investmentSchedule.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Create subscription (generates full 52-week schedule upfront)
router.post("/create", createInvestmentSubscription);
router.post("/", createInvestmentSubscription);

// Read subscriptions
router.get("/", getAllInvestmentSubscriptions);
router.get("/:id", getInvestmentSubscriptionById);
router.get("/:subscription_id/schedules", getSchedulesBySubscriptionId);

// Update subscription status
router.put("/:id", updateInvestmentSubscription);

// Delete subscription
router.delete("/:id", deleteInvestmentSubscription);

export default router;
