import { smsService } from "../../src/sms/sms.service.js";

/**
 * Test Bill Created SMS
 * POST /api/test-sms or POST /api/test/sms
 */
export const testSMS = async (req, res) => {
  try {
    const phone = req.body?.phone || req.query?.phone || process.env.TEST_MOBILE;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required in request body or TEST_MOBILE in .env",
      });
    }

    const result = await smsService.sendBillCreated(
      phone,
      {
        customerName: req.body?.customerName || "Kural",
        invoiceNumber: req.body?.invoiceNumber || "INV/26-27/TEST",
        amount: req.body?.amount || "1500.00",
        balance: req.body?.balance || "0.00",
        dueDate: req.body?.dueDate || new Date().toISOString().split("T")[0],
      }
    );

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[Test SMS]", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Test Payment Received SMS
 */
export const testPaymentSMS = async (req, res) => {
  try {
    const phone = req.body?.phone || req.query?.phone || process.env.TEST_MOBILE;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const result = await smsService.sendPaymentReceived(phone, {
      customerName: req.body?.customerName || "Kural",
      invoiceNumber: req.body?.invoiceNumber || "INV/26-27/TEST",
      amount: req.body?.amount || "1500.00",
      balance: req.body?.balance || "0.00",
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[Test Payment SMS]", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Test Chit Created SMS
 */
export const testChitSMS = async (req, res) => {
  try {
    const phone = req.body?.phone || req.query?.phone || process.env.TEST_MOBILE;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const result = await smsService.sendChitCreated(phone, {
      customerName: req.body?.customerName || "Kural",
      groupName: req.body?.groupName || "DT-CHIT-1L",
      chitValue: req.body?.chitValue || "100000",
      installmentAmount: req.body?.installmentAmount || "5000",
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[Test Chit SMS]", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Test Loan Approved SMS
 */
export const testLoanSMS = async (req, res) => {
  try {
    const phone = req.body?.phone || req.query?.phone || process.env.TEST_MOBILE;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const result = await smsService.sendLoanApproved(phone, {
      customerName: req.body?.customerName || "Kural",
      loanNumber: req.body?.loanNumber || "LN-TEST-001",
      amount: req.body?.amount || "50000",
      emiAmount: req.body?.emiAmount || "2500",
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[Test Loan SMS]", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Test OTP SMS
 */
export const testOtpSMS = async (req, res) => {
  try {
    const phone = req.body?.phone || req.query?.phone || process.env.TEST_MOBILE;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const result = await smsService.sendOtp(phone, {
      otp: req.body?.otp || Math.floor(1000 + Math.random() * 9000),
      expiryMinutes: req.body?.expiryMinutes || 5,
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[Test OTP SMS]", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
