import express from "express";

import {
  getCustomerSubscriptions,
  getCustomerSubscriptionById,
  getCustomerFullDetails,
  getBatchSummary,
  getPlanSummary,
  getBatchDetails,
  getBatchSummaryById
} from "../../controllers/chit/subscriptions/getSubscription.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { createCustomerSubscription } from "../../controllers/chit/subscriptions/createSubscription.controller.js";
import { updateCustomerSubscription } from "../../controllers/chit/subscriptions/updateSubcription.controller.js";
import { deleteCustomerSubscription } from "../../controllers/chit/subscriptions/deleteSubscription.controller.js";

const router = express.Router();

router.use(verifyToken);

/* CREATE */
router.post("/create", createCustomerSubscription);

/* GET ALL */
router.get("/", getCustomerSubscriptions);

// 📊 DASHBOARD / SUMMARY
router.get("/batch-summary", getBatchSummary);
router.get("/batch-summary/:batch_id", getBatchSummaryById);
router.get("/plan-summary", getPlanSummary);

// 📊 SPECIFIC BATCH DETAILS
router.get("/batch-details/:batch_id", getBatchDetails);

/* CUSTOMER FULL DASHBOARD */
router.get("/customer-details/:id", getCustomerFullDetails);

/* GET SINGLE */
router.get("/:id", getCustomerSubscriptionById);

/* UPDATE */
router.put("/:id", updateCustomerSubscription);

/* DELETE */
router.delete("/:id", deleteCustomerSubscription);

export default router;