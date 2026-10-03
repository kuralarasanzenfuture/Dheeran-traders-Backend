import express from "express";
import {
  processMonthlyInvestmentPayment,
  getAllMonthlyInvestmentPayments,
  getMonthlyInvestmentPaymentById,
} from "../../controllers/chit/monthly-investment/payment/monthlyInvestmentPayment.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Process payment (INTEREST, PRINCIPAL, or INTEREST_AND_PRINCIPAL)
// Strictly validates: CANCELLED or PRECLOSED subscriptions cannot receive payments
router.post("/process", processMonthlyInvestmentPayment);
router.post("/", processMonthlyInvestmentPayment);

// Read payments
router.get("/", getAllMonthlyInvestmentPayments);
router.get("/:id", getMonthlyInvestmentPaymentById);

export default router;
