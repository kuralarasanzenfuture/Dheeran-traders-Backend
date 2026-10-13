import express from "express";
import {
  testSMS,
  testPaymentSMS,
  testChitSMS,
  testLoanSMS,
  testOtpSMS,
} from "./testSMS.controller.js";

const router = express.Router();

/**
 * Route: POST /api/test-sms (or GET for quick browser test)
 * Trigger Bill Created SMS
 */
router.post("/", testSMS);
router.get("/", testSMS);
router.post("/bill-created", testSMS);

/**
 * Other test endpoints
 */
router.post("/payment-received", testPaymentSMS);
router.post("/chit-created", testChitSMS);
router.post("/loan-approved", testLoanSMS);
router.post("/otp", testOtpSMS);

export default router;
