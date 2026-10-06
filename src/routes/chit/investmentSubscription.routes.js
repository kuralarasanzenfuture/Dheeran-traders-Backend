import express from "express";
import {
  createInvestmentSubscription,
  previewInvestmentSubscription,
  getAllInvestmentSubscriptions,
  getInvestmentSubscriptionById,
  updateInvestmentSubscriptionStatus,
  updateInvestmentSubscription,
  deleteInvestmentSubscription,
  getInvestmentSubscriptionPreclosurePreview,
  precloseInvestmentSubscription,
} from "../../controllers/chit/investment/subscription/investmentSubscription.controller.js";
import { getSchedulesBySubscriptionId } from "../../controllers/chit/investment/schedule/investmentSchedule.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Preview subscription & generated schedules before creating
router.get("/preview", previewInvestmentSubscription);
router.post("/preview", previewInvestmentSubscription);

// Create subscription (generates full 52-week schedule upfront)
router.post("/create", createInvestmentSubscription);
router.post("/", createInvestmentSubscription);

// Read subscriptions
router.get("/", getAllInvestmentSubscriptions);
router.get("/:id", getInvestmentSubscriptionById);
router.get("/:subscription_id/schedules", getSchedulesBySubscriptionId);

// Preclosure Preview (calculates close amount without commit)
router.get("/:id/preclosure-preview", getInvestmentSubscriptionPreclosurePreview);

// Preclose dedicated endpoint
router.post("/:id/preclose", precloseInvestmentSubscription);

// Update status (e.g. PRECLOSED, CANCELLED)
router.patch("/:id/status", updateInvestmentSubscriptionStatus);
router.put("/:id/status", updateInvestmentSubscriptionStatus);

// Update subscription status (legacy/general)
router.put("/:id", updateInvestmentSubscription);

// Delete subscription
router.delete("/:id", deleteInvestmentSubscription);

export default router;

