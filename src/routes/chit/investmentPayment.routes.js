import express from "express";
import {
  processInvestmentPayment,
  getAllInvestmentPayments,
  getInvestmentPaymentById,
  getPaymentSummaryBySubscription,
  getDueInstallmentsForPayment,
} from "../../controllers/chit/investment/payment/investmentPayment.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Process payment (INTEREST, PRINCIPAL, or INTEREST_AND_PRINCIPAL)
// Validates: payment can only be made on or after interest_due_date and lock_in_end_date
router.post("/process", processInvestmentPayment);
router.post("/", processInvestmentPayment);

// Read payments
router.get("/", getAllInvestmentPayments);
router.get("/:id", getInvestmentPaymentById);

// Subscription payment statements and eligible due installments
router.get("/subscription/:subscription_id/summary", getPaymentSummaryBySubscription);
router.get("/subscription/:subscription_id/due", getDueInstallmentsForPayment);

export default router;
