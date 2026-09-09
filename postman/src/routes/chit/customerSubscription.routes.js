import express from "express";

import {
  getCustomerSubscriptions,
  getCustomerSubscriptionById,
  getCustomerFullDetails,
  getBatchSummary,
  getPlanSummary,
  getBatchDetails,
  getBatchSummaryById,
  getActiveCustomers,
  getThisMonthCollection,
  getTotalCollection,
  getPendingCollection,
  getDashboardStats,
} from "../../controllers/chit/subscriptions/getSubscription.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { createCustomerSubscription } from "../../controllers/chit/subscriptions/createSubscription.controller.js";
import { updateCustomerSubscription } from "../../controllers/chit/subscriptions/updateSubcription.controller.js";
import { deleteCustomerSubscription } from "../../controllers/chit/subscriptions/deleteSubscription.controller.js";
import {
  payCustomerMaturity,
  revertCustomerMaturity,
  getMaturitySummary,
} from "../../controllers/chit/subscriptions/maturitySubscription.controller.js";

const router = express.Router();

router.use(verifyToken);

/* CREATE */
router.post("/create", createCustomerSubscription);
router.post("/", createCustomerSubscription); // Also support standard POST /

/* GET ALL */
router.get("/", getCustomerSubscriptions);

// 📊 DASHBOARD / SUMMARY
router.get("/batch-summary", getBatchSummary);
router.get("/batch-summary/:batch_id", getBatchSummaryById);
router.get("/plan-summary", getPlanSummary);
router.get("/active-customers", getActiveCustomers);
router.get("/this-month-collection", getThisMonthCollection);
router.get("/total-collection", getTotalCollection);
router.get("/pending-collection", getPendingCollection);
router.get("/dashboard-stats", getDashboardStats);

// 💰 MATURITY SUMMARY & LISTING
router.get("/maturity-summary", getMaturitySummary);

// 📊 SPECIFIC BATCH DETAILS
router.get("/batch-details/:batch_id", getBatchDetails);

/* CUSTOMER FULL DASHBOARD */
router.get("/customer-details/:id", getCustomerFullDetails);

/* GET SINGLE */
router.get("/:id", getCustomerSubscriptionById);

/* UPDATE */
router.put("/:id", updateCustomerSubscription);
router.patch("/:id", updateCustomerSubscription);

/* 💰 MATURITY SETTLEMENT APIS */
router.post("/:id/maturity-pay", payCustomerMaturity);
router.patch("/:id/maturity-pay", payCustomerMaturity);
router.put("/:id/maturity-pay", payCustomerMaturity);

router.post("/:id/maturity-revert", revertCustomerMaturity);
router.patch("/:id/maturity-revert", revertCustomerMaturity);

/* DELETE */
router.delete("/:id", deleteCustomerSubscription);

export default router;