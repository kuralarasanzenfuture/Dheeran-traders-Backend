import express from "express";
import {
  createInstallments,
  getAllInstallments,
  getInstallmentsBySubscription,
  getInstallmentById,
  updateInstallment,
  deleteInstallment,
  payInstallment,
} from "../../controllers/chit/customerInstallment.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// CREATE
router.post("/create", createInstallments);

// READ
router.get("/", getAllInstallments);
router.get("/subscription/:subscription_id", getInstallmentsBySubscription);
router.get("/:id", getInstallmentById);

// UPDATE
router.put("/:id", updateInstallment);

// DELETE
router.delete("/:id", deleteInstallment);

// PAYMENT
router.post("/pay/:id", payInstallment);

export default router;