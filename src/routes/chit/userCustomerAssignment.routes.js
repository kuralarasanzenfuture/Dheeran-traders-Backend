import express from "express";
import {
  assignUserToCustomer,
  getMyCustomers,
  removeUserFromCustomer
} from "../../controllers/chit/userCustomerAssignment.controller.js";

import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// 🔐 Assign user to customer
router.post("/assign", assignUserToCustomer);

// 🔐 Get my customers
router.get("/my-customers", getMyCustomers);

// 🔐 Remove assignment
router.delete("/remove", removeUserFromCustomer);

export default router;