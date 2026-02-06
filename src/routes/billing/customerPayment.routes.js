import express from "express";
import {
  addCustomerPayment,
  getPaymentsByBillingId,
  getInvoiceWithPayments,
} from "../../controllers/billing/customerPayment.controller.js";

const router = express.Router();

/* Add payment */
router.post("/", addCustomerPayment);

/* Get payment history */
router.get("/:billing_id", getPaymentsByBillingId);

/* Get invoice + paid + balance */
router.get("/invoice/:billing_id", getInvoiceWithPayments);

export default router;