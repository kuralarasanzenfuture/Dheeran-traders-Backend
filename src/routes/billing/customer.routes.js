import express from "express";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../../controllers/billing/customer.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createCustomer);
router.get("/",protect, getCustomers);
router.get("/:id",protect, getCustomerById);
router.put("/:id",protect, updateCustomer);
router.delete("/:id",protect, deleteCustomer);

export default router;
