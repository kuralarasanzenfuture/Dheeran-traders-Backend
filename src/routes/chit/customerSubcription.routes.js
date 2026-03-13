import express from "express";

import {
  createCustomerSubscription,
  updateCustomerSubscription,
  deleteCustomerSubscription,
  getCustomerSubscriptions,
  getCustomerSubscriptionById,
  getCustomerFullDetails
} from "../../controllers/chit/customerSubcription.controller.js";

const router = express.Router();

/* CREATE */
router.post("/create", createCustomerSubscription);

/* GET ALL */
router.get("/", getCustomerSubscriptions);

/* CUSTOMER FULL DASHBOARD */
router.get("/customer-details/:id", getCustomerFullDetails);

/* GET SINGLE */
router.get("/:id", getCustomerSubscriptionById);

/* UPDATE */
router.put("/:id", updateCustomerSubscription);

/* DELETE */
router.delete("/:id", deleteCustomerSubscription);

export default router;