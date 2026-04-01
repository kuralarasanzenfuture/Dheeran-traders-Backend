import express from "express";
import {
  createInstallments,
  getAllInstallments,
  getInstallmentsBySubscription,
  getInstallmentById,
  updateInstallment,
  deleteInstallment,
  payInstallment,
} from "../../controllers/chit/installments/customerInstallment.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import {
  getCollectionDashboard,
  getCollectorDueList,
  getOverdueInstallments,
  getPriorityDueList,
  getTodayDueList,
  getTodayDueSummary,
} from "../../controllers/chit/installments/getcustomerInstallment.controller.js";

const router = express.Router();

// router.use(verifyToken);

// CREATE
router.post("/create", createInstallments);

// READ
router.get("/", getAllInstallments);

router.get("/due/today/summary", getTodayDueSummary);
router.get("/due/today", getTodayDueList);
router.get("/due/overdue", getOverdueInstallments);

router.get("/due/collector", verifyToken, getCollectorDueList);
router.get("/dashboard/collection", verifyToken, getCollectionDashboard);
router.get("/due/priority", verifyToken, getPriorityDueList);

router.get("/subscription/:subscription_id", getInstallmentsBySubscription);
router.get("/:id", getInstallmentById);

// UPDATE
router.put("/:id", updateInstallment);

// DELETE
router.delete("/:id", deleteInstallment);

// PAYMENT
router.post("/pay/:id", payInstallment);

export default router;
