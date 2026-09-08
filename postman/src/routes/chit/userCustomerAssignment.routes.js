import express from "express";
import {
  assignUserToCustomer,
  getMyCustomers,
  removeUserFromCustomer,
  updateAssignment
} from "../../controllers/chit/userCustomerAssignment.controller.js";

import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// 🔐 Create Assign user to customer
router.post("/assign", assignUserToCustomer);

// 🔐 Get my customers
router.get("/my-customers", getMyCustomers);

// UPDATE
router.put("/:id", updateAssignment);


// 🔐 Remove assignment
// router.delete("/remove", removeUserFromCustomer);
router.delete("/:id", removeUserFromCustomer);

export default router;