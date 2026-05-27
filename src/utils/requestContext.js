import { v4 as uuidv4 } from "uuid";


export const requestContext = (req, res, next) => {
  req.requestId = uuidv4();

  // 🔥 Get real IP (works with proxy too)
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  req.clientIp = ip;

  next();
};