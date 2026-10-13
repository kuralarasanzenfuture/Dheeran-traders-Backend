import { msg91Service } from "./providers/msg91/msg91.service.js";
import { billingTemplates } from "./templates/billing.templates.js";
import { loanTemplates } from "./templates/loan.templates.js";
import { chitTemplates } from "./templates/chit.templates.js";
import { paymentTemplates } from "./templates/payment.templates.js";
import { otpTemplates } from "./templates/otp.templates.js";

export const smsService = {
  // =========================================================================
  // 📜 BILLING
  // =========================================================================

  async sendBillCreated(
    phone,
    { customerName, invoiceNumber, amount, balance, dueDate } = {},
  ) {
    const template = billingTemplates.invoiceGenerated;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        customerName,
        invoiceNumber,
        amount,
        balance,
        dueDate,
      }),
    });
  },

  async sendPaymentReceived(
    phone,
    { customerName, invoiceNumber, amount, balance },
  ) {
    const template = billingTemplates.paymentReceived;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        customerName,
        invoiceNumber,
        amount,
        balance,
      }),
    });
  },

  async sendBillDue(
    phone,
    { customerName, invoiceNumber, amount, dueDate },
  ) {
    const template = billingTemplates.billDue;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        customerName,
        invoiceNumber,
        amount,
        dueDate,
      }),
    });
  },

  // =========================================================================
  // 💳 LOAN
  // =========================================================================

  async sendLoanApproved(
    phone,
    { customerName, loanNumber, amount, emiAmount },
  ) {
    const template = loanTemplates.loanApproved;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        customerName,
        loanNumber,
        amount,
        emiAmount,
      }),
    });
  },

  async sendLoanInstallmentDue(
    phone,
    { customerName, loanNumber, emiAmount, dueDate },
  ) {
    const template = loanTemplates.installmentDue;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        customerName,
        loanNumber,
        emiAmount,
        dueDate,
      }),
    });
  },

  async sendLoanPaymentReceived(
    phone,
    { customerName, loanNumber, amount, receiptNo },
  ) {
    const template = loanTemplates.paymentReceived;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        customerName,
        loanNumber,
        amount,
        receiptNo,
      }),
    });
  },

  // =========================================================================
  // 🪙 CHIT
  // =========================================================================

  async sendChitCreated(
    phone,
    { customerName, groupName, chitValue, installmentAmount },
  ) {
    const template = chitTemplates.chitCreated;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        customerName,
        groupName,
        chitValue,
        installmentAmount,
      }),
    });
  },

  async sendChitInstallmentDue(
    phone,
    { customerName, groupName, amount, installmentNo, dueDate },
  ) {
    const template = chitTemplates.installmentDue;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        customerName,
        groupName,
        amount,
        installmentNo,
        dueDate,
      }),
    });
  },

  async sendChitPaymentReceived(
    phone,
    { customerName, groupName, amount, installmentNo, receiptNo },
  ) {
    const template = chitTemplates.paymentReceived;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        customerName,
        groupName,
        amount,
        installmentNo,
        receiptNo,
      }),
    });
  },

  // =========================================================================
  // 💰 PAYMENT
  // =========================================================================

  async sendPaymentSuccess(
    phone,
    { customerName, transactionId, amount, paymentDate },
  ) {
    const template = paymentTemplates.paymentSuccess;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        customerName,
        transactionId,
        amount,
        paymentDate,
      }),
    });
  },

  async sendPaymentFailed(
    phone,
    { customerName, transactionId, amount, reason },
  ) {
    const template = paymentTemplates.paymentFailed;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        customerName,
        transactionId,
        amount,
        reason,
      }),
    });
  },

  // =========================================================================
  // 🔐 OTP
  // =========================================================================

  async sendOtp(phone, { otp, expiryMinutes }) {
    const template = otpTemplates.otp;

    return msg91Service.sendTemplateSMS({
      phone,
      templateId: template.templateId,
      variables: template.variables({
        otp,
        expiryMinutes,
      }),
    });
  },

  // =========================================================================
  // 🌐 GENERIC SEND
  // =========================================================================

  async sendSMS({ phone, templateId, variables = {} }) {
    return msg91Service.sendTemplateSMS({
      phone,
      templateId,
      variables,
    });
  },
};

export const sendSMS = smsService.sendSMS.bind(smsService);
export default smsService;
