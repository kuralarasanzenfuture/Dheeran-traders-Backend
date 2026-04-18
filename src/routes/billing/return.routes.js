import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import {
  createCustomerReturn,
  deleteCustomerReturn,
  updateCustomerReturn,
} from "../../controllers/billing/return/return.controller.js";
import {
  getAllReturns,
  getReturnById,
  getReturnsByBillingId,
  getReturnSummary,
  getReturnWithInvoice,
} from "../../controllers/billing/return/getReturn.controller.js";

const router = express.Router();

router.use(verifyToken);

/* CREATE */
router.post("/", createCustomerReturn);

/* GET */
router.get("/", getAllReturns);
router.get("/billing/:billing_id", getReturnsByBillingId);
router.get("/summary/:billing_id", getReturnSummary);
router.get("/invoice/:id", getReturnWithInvoice);
router.get("/:id", getReturnById);

/* UPDATE */
router.put("/:id", updateCustomerReturn);

/* DELETE */
router.delete("/:id", deleteCustomerReturn);

export default router;
