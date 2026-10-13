import dotenv from "dotenv";
dotenv.config();

export const billingTemplates = {
  /**
   * Template:
   * "Dear ##name##, payment of Rs. ##amount## has been received for invoice ##invoice_no##. Your remaining balance is Rs. ##balance##. Thank you, Dheeran Traders."
   */
  invoiceGenerated: {
    get templateId() {
      return (
        process.env.MSG91_BILL_CREATED_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({
      customerName,
      invoiceNumber,
      amount,
      balance = "0.00",
      dueDate,
    } = {}) => ({
      name: customerName || "Customer",
      amount: String(amount ?? "0.00"),
      invoice_no: invoiceNumber || "N/A",
      balance: String(balance ?? "0.00"),
      // Aliases
      customer_name: customerName || "Customer",
      invoice_number: invoiceNumber || "N/A",
      bill_number: invoiceNumber || "N/A",
      due_date: dueDate || "N/A",
    }),
  },

  paymentReceived: {
    get templateId() {
      return (
        process.env.MSG91_BILL_PAID_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({
      customerName,
      invoiceNumber,
      amount,
      balance = "0.00",
    } = {}) => ({
      name: customerName || "Customer",
      amount: String(amount ?? "0.00"),
      invoice_no: invoiceNumber || "N/A",
      balance: String(balance ?? "0.00"),
      customer_name: customerName || "Customer",
      invoice_number: invoiceNumber || "N/A",
    }),
  },

  billDue: {
    get templateId() {
      return (
        process.env.MSG91_BILL_DUE_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({ customerName, invoiceNumber, amount, dueDate } = {}) => ({
      name: customerName || "Customer",
      invoice_no: invoiceNumber || "N/A",
      amount: String(amount ?? "0.00"),
      due_date: dueDate || "N/A",
      customer_name: customerName || "Customer",
      invoice_number: invoiceNumber || "N/A",
    }),
  },
};

export default billingTemplates;
