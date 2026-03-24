
export const normalizeLoginId = (loginId) => {
  return loginId?.trim().toLowerCase();
};

export const getClientInfo = (req) => {
  return {
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "unknown",
  };
};

export const isExpired = (date) => {
  return new Date(date) < new Date();
};


import { normalizeLoginId, getClientInfo } from "../utils/helpers.js";

const loginId = normalizeLoginId(req.body.login_id);

const { ip, userAgent } = getClientInfo(req);