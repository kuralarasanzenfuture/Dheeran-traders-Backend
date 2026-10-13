import dotenv from "dotenv";
dotenv.config();

export const paymentTemplates = {
  paymentSuccess: {
    get templateId() {
      return (
        process.env.MSG91_PAYMENT_SUCCESS_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({ customerName, transactionId, amount, paymentDate }) => ({
      customer_name: customerName || "Customer",
      transaction_id: transactionId || "N/A",
      amount: String(amount ?? "0"),
      payment_date: paymentDate || new Date().toISOString().split("T")[0],
      customerName: customerName || "Customer",
      transactionId: transactionId || "N/A",
      paymentDate: paymentDate || new Date().toISOString().split("T")[0],
    }),
  },

  paymentFailed: {
    get templateId() {
      return (
        process.env.MSG91_PAYMENT_FAILED_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({ customerName, transactionId, amount, reason }) => ({
      customer_name: customerName || "Customer",
      transaction_id: transactionId || "N/A",
      amount: String(amount ?? "0"),
      reason: reason || "Declined",
      customerName: customerName || "Customer",
      transactionId: transactionId || "N/A",
    }),
  },
};

export default paymentTemplates;
