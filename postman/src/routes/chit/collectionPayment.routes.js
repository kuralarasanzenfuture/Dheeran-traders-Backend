// import express from "express";
// import { collectPayment } from "../../controllers/chit/collectionPayment.controller.js";
// import { verifyToken } from "../../middlewares/auth.middleware.js";

// const router = express.Router();

// // POST: collect payment
// router.post("/collect",verifyToken, collectPayment);

// export default router;

import express from "express";
import {
  collectPaymentBySubscription,
  collectPaymentByInstallment,
  collectPayment,
  collectPaymentAutoAllocate,
  collectPaymentByCustomer,
  collectPaymentBySelectedInstallmentsBySubscription,
  collectPaymentBySelectedInstallmentsByInstallment,
  collectPaymentBySelectedInstallmentsByCustomer,
} from "../../controllers/chit/payments/collectionPayment.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import {
  getAllPayments,
  getPaymentById,
  getPaymentWithInstallments,
} from "../../controllers/chit/payments/getPayment.controller.js";
import { deletePayment } from "../../controllers/chit/payments/deletePayment.controller.js";
import { updatePayment } from "../../controllers/chit/payments/updatePayment.controller.js";

const router = express.Router();

router.use(verifyToken);

router.post("/collect", collectPayment);

router.post("/collect-auto", collectPaymentAutoAllocate);

// 🔥 Smart payment (recommended)
router.post("/collect/subscription", collectPaymentBySubscription);

router.post(
  "/collect/selected-installments-by-subscription",
  collectPaymentBySelectedInstallmentsBySubscription,
);

// 🔧 Manual payment (specific installment)
router.post("/collect/installment", collectPaymentByInstallment);

router.post(
  "/collect/selected-installments-by-installment",
  collectPaymentBySelectedInstallmentsByInstallment,
);

router.post("/collect/customer", collectPaymentByCustomer);

router.post(
  "/collect/selected-installments-by-customer",
  collectPaymentBySelectedInstallmentsByCustomer,
);

// ✏️ UPDATE
router.put("/update/:payment_id", updatePayment);

// ❌ DELETE (SOFT DELETE) but hard delete i do
router.delete("/delete/:payment_id", deletePayment);

// 📄 GET
router.get("/:payment_id", getPaymentById);
router.get("/with-installments/:payment_id", getPaymentWithInstallments);
router.get("/", getAllPayments);

export default router;
