import dotenv from "dotenv";
dotenv.config();

export const loanTemplates = {
  loanApproved: {
    get templateId() {
      return (
        process.env.MSG91_LOAN_APPROVED_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({ customerName, loanNumber, amount, emiAmount }) => ({
      customer_name: customerName || "Customer",
      loan_number: loanNumber || "N/A",
      amount: String(amount ?? "0"),
      emi_amount: String(emiAmount ?? "0"),
      customerName: customerName || "Customer",
      loanNumber: loanNumber || "N/A",
      emiAmount: String(emiAmount ?? "0"),
    }),
  },

  installmentDue: {
    get templateId() {
      return (
        process.env.MSG91_LOAN_INSTALLMENT_DUE_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({ customerName, loanNumber, emiAmount, dueDate }) => ({
      customer_name: customerName || "Customer",
      loan_number: loanNumber || "N/A",
      emi_amount: String(emiAmount ?? "0"),
      due_date: dueDate || "N/A",
      customerName: customerName || "Customer",
      loanNumber: loanNumber || "N/A",
      emiAmount: String(emiAmount ?? "0"),
      dueDate: dueDate || "N/A",
    }),
  },

  paymentReceived: {
    get templateId() {
      return (
        process.env.MSG91_LOAN_PAYMENT_RECEIVED_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({ customerName, loanNumber, amount, receiptNo }) => ({
      customer_name: customerName || "Customer",
      loan_number: loanNumber || "N/A",
      amount: String(amount ?? "0"),
      receipt_no: receiptNo || "N/A",
      customerName: customerName || "Customer",
      loanNumber: loanNumber || "N/A",
      receiptNo: receiptNo || "N/A",
    }),
  },
};

export default loanTemplates;
