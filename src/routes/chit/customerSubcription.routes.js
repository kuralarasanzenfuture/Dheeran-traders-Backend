import express from "express";

import {
  createCustomerSubscription,
  updateCustomerSubscription,
  deleteCustomerSubscription,
  getCustomerSubscriptions,
  getCustomerSubscriptionById
} from "../../controllers/chit/customerSubcription.controller.js";

const router = express.Router();

router.post("/create", createCustomerSubscription);

router.get("/", getCustomerSubscriptions);

router.get("/:id", getCustomerSubscriptionById);

router.put("/update/:id", updateCustomerSubscription);

router.delete("/delete/:id", deleteCustomerSubscription);

export default router;