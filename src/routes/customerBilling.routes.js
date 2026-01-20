import express from "express";
import {
  createCustomerBilling,
  getAllCustomerBillings,
  getCustomerBillingById,
} from "../controllers/customerBilling.controller.js";

const router = express.Router();

/* CREATE INVOICE */
router.post("/", createCustomerBilling);

/* GET ALL */
router.get("/", getAllCustomerBillings);

/* GET BY ID */
router.get("/:id", getCustomerBillingById);

export default router;
