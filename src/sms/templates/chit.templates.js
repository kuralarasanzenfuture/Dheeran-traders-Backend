import dotenv from "dotenv";
dotenv.config();

export const chitTemplates = {
  chitCreated: {
    get templateId() {
      return (
        process.env.MSG91_CHIT_CREATED_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({ customerName, groupName, chitValue, installmentAmount }) => ({
      customer_name: customerName || "Member",
      group_name: groupName || "Chit",
      chit_value: String(chitValue ?? "0"),
      installment_amount: String(installmentAmount ?? "0"),
      customerName: customerName || "Member",
      groupName: groupName || "Chit",
      chitValue: String(chitValue ?? "0"),
      installmentAmount: String(installmentAmount ?? "0"),
    }),
  },

  installmentDue: {
    get templateId() {
      return (
        process.env.MSG91_CHIT_INSTALLMENT_DUE_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({ customerName, groupName, amount, installmentNo, dueDate }) => ({
      customer_name: customerName || "Member",
      group_name: groupName || "Chit",
      amount: String(amount ?? "0"),
      installment_no: String(installmentNo ?? "1"),
      due_date: dueDate || "N/A",
      customerName: customerName || "Member",
      groupName: groupName || "Chit",
      installmentNo: String(installmentNo ?? "1"),
      dueDate: dueDate || "N/A",
    }),
  },

  paymentReceived: {
    get templateId() {
      return (
        process.env.MSG91_CHIT_PAYMENT_RECEIVED_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({ customerName, groupName, amount, installmentNo, receiptNo }) => ({
      customer_name: customerName || "Member",
      group_name: groupName || "Chit",
      amount: String(amount ?? "0"),
      installment_no: String(installmentNo ?? "1"),
      receipt_no: receiptNo || "N/A",
      customerName: customerName || "Member",
      groupName: groupName || "Chit",
      installmentNo: String(installmentNo ?? "1"),
      receiptNo: receiptNo || "N/A",
    }),
  },
};

export default chitTemplates;
