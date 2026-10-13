import dotenv from "dotenv";
dotenv.config();

export const otpTemplates = {
  otp: {
    get templateId() {
      return (
        process.env.MSG91_OTP_TEMPLATE_ID ||
        process.env.MSG91_TEMPLATE_ID ||
        ""
      );
    },
    variables: ({ otp, expiryMinutes }) => ({
      otp: String(otp || ""),
      expiry_minutes: String(expiryMinutes || "5"),
      expiryMinutes: String(expiryMinutes || "5"),
    }),
  },
};

export default otpTemplates;
