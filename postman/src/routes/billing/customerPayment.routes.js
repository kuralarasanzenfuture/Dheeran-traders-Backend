import express from "express";
import {
  addCustomerPayment,
  getPaymentsByBillingId,
  getInvoiceWithPayments,
  getAllPayments,
  updateCustomerPayment,
  deleteCustomerPayment,
  getMyPayments,
} from "../../controllers/billing/customerPayment.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", addCustomerPayment);

router.put("/:id", updateCustomerPayment);

router.get("/", getAllPayments);

router.get("/my-payments", verifyToken, getMyPayments);

/* Get invoice + paid + balance */
router.get("/invoice/:billing_id", getInvoiceWithPayments);

/* Get payment history */
router.get("/:billing_id", getPaymentsByBillingId);

router.delete("/:id", deleteCustomerPayment);

export default router;
