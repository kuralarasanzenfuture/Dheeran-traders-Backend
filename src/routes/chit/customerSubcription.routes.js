import express from "express";

import {
  createCustomerSubscription,
  updateCustomerSubscription,
  deleteCustomerSubscription,
  getCustomerSubscriptions,
  getCustomerSubscriptionById,
  getCustomerFullDetails,
  getBatchSummary,
  getPlanSummary,
  getBatchDetails,
  getBatchSummaryById
} from "../../controllers/chit/customerSubcription.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

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