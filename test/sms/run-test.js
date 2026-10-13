import dotenv from "dotenv";
dotenv.config();

import { smsService } from "../../src/sms/sms.service.js";

const testPhone = process.argv[2] || process.env.TEST_MOBILE || "916380564945";

// Test payload data
const testData = {
  customerName: "Kural",
  invoiceNumber: "INV/26-27/TEST",
  amount: "1500.00",
  balance: "500.00",
  dueDate: new Date().toISOString().split("T")[0],
};

// Expected message template in MSG91
const expectedMessage = `Dear ${testData.customerName}, payment of Rs. ${testData.amount} has been received for invoice ${testData.invoiceNumber}. Your remaining balance is Rs. ${testData.balance}. Thank you, Dheeran Traders.`;

console.log("================================================================================");
console.log("🚀 TESTING BILL CREATED / PAYMENT RECEIVED SMS via MSG91");
console.log("================================================================================");
console.log("📱 Target Mobile :", testPhone);
console.log("📄 Template ID   :", process.env.MSG91_BILL_CREATED_TEMPLATE_ID || process.env.MSG91_TEMPLATE_ID);
console.log("💬 Expected SMS  :\n  ", expectedMessage);
console.log("📦 Variables Sent:");
console.log({
  name: testData.customerName,
  amount: testData.amount,
  invoice_no: testData.invoiceNumber,
  balance: testData.balance,
});
console.log("================================================================================");

async function run() {
  try {
    const result = await smsService.sendBillCreated(testPhone, testData);

    console.log("✅ SMS Sent Successfully!");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ SMS Error:", error.message);
  }
}

run();
