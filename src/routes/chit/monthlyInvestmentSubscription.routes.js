import express from "express";
import {
  createMonthlyInvestmentSubscription,
  previewMonthlyInvestmentSubscription,
  getAllMonthlyInvestmentSubscriptions,
  getMonthlyInvestmentSubscriptionById,
  updateMonthlyInvestmentSubscriptionStatus,
  deleteMonthlyInvestmentSubscription,
  getMonthlyInvestmentSubscriptionPreclosurePreview,
  precloseMonthlyInvestmentSubscription,
} from "../../controllers/chit/monthly-investment/subscription/monthlyInvestmentSubscription.controller.js";
import { getSchedulesBySubscriptionId } from "../../controllers/chit/monthly-investment/schedule/monthlyInvestmentSchedule.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Preview subscription & generated schedules before creating
router.get("/preview", previewMonthlyInvestmentSubscription);
router.post("/preview", previewMonthlyInvestmentSubscription);

// Create subscription (generates full future schedules upfront)
router.post("/create", createMonthlyInvestmentSubscription);
router.post("/", createMonthlyInvestmentSubscription);

// Read subscriptions
router.get("/", getAllMonthlyInvestmentSubscriptions);
router.get("/:id", getMonthlyInvestmentSubscriptionById);
router.get("/:subscription_id/schedules", getSchedulesBySubscriptionId);

// Preclosure Preview (calculates close amount without commit)
router.get("/:id/preclosure-preview", getMonthlyInvestmentSubscriptionPreclosurePreview);

// Preclose dedicated endpoint
router.post("/:id/preclose", precloseMonthlyInvestmentSubscription);

// Update status (e.g. PRECLOSED, CANCELLED)
router.patch("/:id/status", updateMonthlyInvestmentSubscriptionStatus);
router.put("/:id/status", updateMonthlyInvestmentSubscriptionStatus);

// Delete subscription
router.delete("/:id", deleteMonthlyInvestmentSubscription);

export default router;
