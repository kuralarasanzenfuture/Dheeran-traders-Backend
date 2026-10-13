import dotenv from "dotenv";
dotenv.config();

export const msg91Config = {
  authKey: process.env.MSG91_AUTH_KEY || "",
  baseUrl: process.env.MSG91_BASE_URL || "https://control.msg91.com",
};

export default msg91Config;