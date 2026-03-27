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
  collectPayment
} from "../../controllers/chit/collectionPayment.controller.js";
import { protect, verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/collect",verifyToken, collectPayment);

// 🔥 Smart payment (recommended)
router.post("/collect/subscription",protect, collectPaymentBySubscription);

// 🔧 Manual payment (specific installment)
// router.post("/collect/installment", verifyToken, collectPaymentByInstallment);
router.post("/collect/installment", protect, collectPaymentByInstallment);

export default router;