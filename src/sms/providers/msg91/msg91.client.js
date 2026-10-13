import axios from "axios";
import { msg91Config } from "./msg91.config.js";

export const msg91Client = axios.create({
  baseURL: msg91Config.baseUrl,
  headers: {
    authkey: msg91Config.authKey,
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

msg91Client.interceptors.request.use((config) => {
  if (!config.headers.authkey) {
    config.headers.authkey = process.env.MSG91_AUTH_KEY || msg91Config.authKey;
  }
  return config;
});

export default msg91Client;
