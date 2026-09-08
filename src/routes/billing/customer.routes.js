import express from "express";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  updateCustomerLocation,
  deleteCustomer,
} from "../../controllers/billing/customer.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  updateCustomerLocationSchema,
} from "../../validations/customer.validation.js";

const router = express.Router();

// 🔒 Protect all customer routes with JWT authentication
router.use(verifyToken);

/**
 * Customer Core Routes
 */
router.post("/", validate(createCustomerSchema), createCustomer);
router.get("/", getCustomers);
router.get("/:id", getCustomerById);
router.put("/:id", validate(updateCustomerSchema), updateCustomer);
router.patch("/:id", validate(updateCustomerSchema), updateCustomer);

/**
 * Dedicated Customer Geo-Location Route (Separate API)
 * Supports both PATCH and PUT for client flexibility
 */
router.patch("/:id/location", validate(updateCustomerLocationSchema), updateCustomerLocation);
router.put("/:id/location", validate(updateCustomerLocationSchema), updateCustomerLocation);

/**
 * Customer Delete Route
 */
router.delete("/:id", deleteCustomer);

export default router;
