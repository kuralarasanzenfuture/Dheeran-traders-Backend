import express from "express";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../../controllers/billing/customer.controller.js";
import { protect, verifyToken } from "../../middlewares/auth.middleware.js";
import { checkPermission } from "../../middlewares/permission/permission.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", checkPermission("BILLING_CUSTOMER", "CREATE"), createCustomer);
router.get("/", checkPermission("BILLING_CUSTOMER", "VIEW"), getCustomers);
router.get("/:id", getCustomerById);
router.put("/:id", checkPermission("BILLING_CUSTOMER", "EDIT"), updateCustomer);
router.delete(
  "/:id",
  checkPermission("BILLING_CUSTOMER", "DELETE"),
  deleteCustomer,
);

export default router;
