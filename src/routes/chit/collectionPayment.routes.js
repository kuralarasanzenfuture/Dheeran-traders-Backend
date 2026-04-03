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
  collectPaymentByCustomer
} from "../../controllers/chit/collectionPayment.controller.js";
import { protect, verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/collect", collectPayment);

router.post("/collect-auto", collectPaymentAutoAllocate);

// 🔥 Smart payment (recommended)
router.post("/collect/subscription", collectPaymentBySubscription);

// 🔧 Manual payment (specific installment)
router.post("/collect/installment", collectPaymentByInstallment);

router.post("/collect/customer", collectPaymentByCustomer);


export default router;