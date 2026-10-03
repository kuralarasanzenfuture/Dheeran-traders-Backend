import express from "express";
import {
  assignUserToCustomer,
  getMyCustomers,
  removeUserFromCustomer,
  updateAssignment
} from "../../controllers/billing/assignedCustomer/assignedBillCustomer.js";
import { getUserAssignedAreaBillingCustomers } from "../../controllers/users/userAreaAssignment.controller.js";

import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// 🔐 Create Assign user to customer
router.post("/assign", assignUserToCustomer);

// 🔐 Get my directly assigned customers
router.get("/my-customers", getMyCustomers);

// 🔐 Get billing customers residing in my assigned areas
router.get("/my-area-customers", getUserAssignedAreaBillingCustomers);
router.get("/area-customers", getUserAssignedAreaBillingCustomers);

// UPDATE
router.put("/:id", updateAssignment);

// 🔐 Remove assignment
router.delete("/:id", removeUserFromCustomer);

export default router;