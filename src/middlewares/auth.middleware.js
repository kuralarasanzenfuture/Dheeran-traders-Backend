// import jwt from "jsonwebtoken";
// import db from "../config/db.js";

// export const protect = async (req, res, next) => {
//   try {
//     const auth = req.headers.authorization;

//     if (!auth || !auth.startsWith("Bearer ")) {
//       return res.status(401).json({ message: "Not authorized" });
//     }

//     const token = auth.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const [rows] = await db.query(
//       "SELECT id, username, email, role FROM users WHERE id = ?",
//       [decoded.id]
//     );

//     if (!rows.length) {
//       return res.status(401).json({ message: "User not found" });
//     }

//     req.user = rows[0];
//     next();
//   } catch (err) {
//     res.status(401).json({ message: "Invalid token" });
//   }
// };

// export const adminOnly = (req, res, next) => {
//   if (req.user.role !== "admin") {
//     return res.status(403).json({ message: "Admin access required" });
//   }
//   next();
// };

// const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

// export const verifyToken = (req, res, next) => {

//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return res.status(401).json({
//       message: "Access token required"
//     });
//   }

//   const token = authHeader.split(" ")[1];

//   try {

//     const decoded = jwt.verify(token, ACCESS_SECRET);

//     req.user = decoded;

//     next();

//   } catch (error) {

//     return res.status(401).json({
//       message: "Invalid or expired token"
//     });

//   }

// };

// Authorization: Bearer ACCESS_TOKEN

// export const verifyToken = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return res.status(401).json({
//       message: "Access token required",
//       code: "NO_TOKEN"
//     });
//   }

//   if (!authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({
//       message: "Invalid auth format",
//       code: "INVALID_FORMAT"
//     });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, ACCESS_SECRET);

//     req.user = decoded; // includes permission
//     next();

//   } catch (error) {

//     if (error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         message: "Access token expired",
//         code: "TOKEN_EXPIRED"
//       });
//     }

//     return res.status(401).json({
//       message: "Invalid token",
//       code: "INVALID_TOKEN"
//     });
//   }
// };

// export const verifyToken = (req, res, next) => {

//   let token;

//   // 🔹 1. Check cookie
//   if (req.cookies?.accessToken) {
//     token = req.cookies.accessToken;
//   }

//   // 🔹 2. Check header (mobile)
//   else if (req.headers.authorization?.startsWith("Bearer ")) {
//     token = req.headers.authorization.split(" ")[1];
//   }

//   if (!token) {
//     return res.status(401).json({
//       message: "No token",
//       code: "NO_TOKEN"
//     });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
//     req.user = decoded;
//     next();

//   } catch (err) {

//     if (err.name === "TokenExpiredError") {
//       return res.status(401).json({
//         code: "TOKEN_EXPIRED"
//       });
//     }

//     return res.status(401).json({
//       message: "Invalid token",
//       code: "INVALID_TOKEN"
//     });
//   }
// };

// ---------------------------------------------------------------------------------------------

import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

// export const protect = async (req, res, next) => {
//   try {
//     const auth = req.headers.authorization;

//     console.log("AUTH HEADER:", req.headers.authorization);

//     if (!auth || !auth.startsWith("Bearer ")) {
//       return res.status(401).json({ message: "Not authorized" });
//     }
//     console.log("VERIFYING TOKEN...");
//     const token = auth.split(" ")[1];

//     console.log("TOKEN:", token);

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     console.log("DECODED:", decoded);
//     console.log("FETCHING USER ID:", decoded.id);
//     const [rows] = await db.query(
//       "SELECT id, username, email, role FROM users WHERE id = ?",
//       [decoded.id],
//     );

//     console.log("USER RESULT:", rows);

//     if (!rows.length) {
//       return res.status(401).json({ message: "User not found" });
//     }
// console.log("URL:", req.originalUrl);
//     req.user = rows[0];
//     next();
//   } catch (err) {
//     // res.status(401).json({ message: "Invalid token" });
//     console.error("❌ FAILED URL:", req.originalUrl);
//     console.error("JWT ERROR:", err.message);
//     res.status(401).json({ message: err.message });
//   }
// };

export const protect = async (req, res, next) => {
  try {
    console.log("URL:", req.originalUrl); // 👈 add this

    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      console.error("❌ NO TOKEN:", req.originalUrl); // 👈 add this
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = auth.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      "SELECT id, username, email, role FROM users WHERE id = ?",
      [decoded.id],
    );

    if (!rows.length) {
      console.error("❌ USER NOT FOUND:", req.originalUrl); // 👈 add this
      return res.status(401).json({ message: "User not found" });
    }

    req.user = rows[0];

    next();
  } catch (err) {
    console.error("❌ FAILED URL:", req.originalUrl); // 👈 MOST IMPORTANT
    console.error("JWT ERROR:", err.message);
    res.status(401).json({ message: err.message });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// export const verifyToken = (req, res, next) => {

//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return res.status(401).json({
//       message: "Access token required"
//     });
//   }

//   const token = authHeader.split(" ")[1];

//   try {

//     const decoded = jwt.verify(token, ACCESS_SECRET);

//     req.user = decoded;

//     next();

//   } catch (error) {

//     return res.status(401).json({
//       message: "Invalid or expired token"
//     });

//   }

// };

// Authorization: Bearer ACCESS_TOKEN

// export const verifyToken = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return res.status(401).json({
//       message: "Access token required",
//       code: "NO_TOKEN",
//     });
//   }

//   if (!authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({
//       message: "Invalid auth format",
//       code: "INVALID_FORMAT",
//     });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, ACCESS_SECRET);

//     req.user = decoded; // includes permission
//     next();
//   } catch (error) {
//     if (error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         message: "Access token expired",
//         code: "TOKEN_EXPIRED",
//       });
//     }

//     return res.status(401).json({
//       message: "Invalid token",
//       code: "INVALID_TOKEN",
//     });
//   }
// };

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    // console.log("AUTH HEADER:", authHeader);

    // if (!authHeader || !authHeader.startsWith("Bearer ")) {
    //   return res.status(401).json({ message: "Unauthorized" });
    // }

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header missing",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Invalid authorization format. Use: Bearer <token>",
      });
    }

    // const parts = authHeader.split(" ");

    // if (parts.length !== 2) {
    //   return res.status(401).json({
    //     message: "Invalid authorization format. Expected: Bearer <token>",
    //   });
    // }

    // const [scheme, token] = parts;

    // if (scheme !== "Bearer") {
    //   return res.status(401).json({
    //     message: `Invalid auth scheme '${scheme}'. Expected 'Bearer'`,
    //   });
    // }

    // if (!token) {
    //   return res.status(401).json({
    //     message: "Token missing after Bearer",
    //   });
    // }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, ACCESS_SECRET);

    // 🔥 CHECK USER STATUS + TOKEN VERSION
    const [[user]] = await db.query(
      `SELECT status, token_version FROM users_roles WHERE id=?`,
      [decoded.id],
    );

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: "User is inactive",
      });
    }

    if (user.token_version !== decoded.token_version) {
      return res.status(401).json({
        message: "Session expired (forced logout)",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// export const verifyToken = (req, res, next) => {
//   const requestId = uuidv4(); // unique request tracking
//   req.requestId = requestId;

//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     console.error(`[${requestId}] NO TOKEN`, {
//       url: req.originalUrl,
//       method: req.method,
//       ip: req.ip
//     });

//     return res.status(401).json({
//       success: false,
//       message: "Access token required",
//       code: "NO_TOKEN",
//       requestId
//     });
//   }

//   if (!authHeader.startsWith("Bearer ")) {
//     console.error(`[${requestId}] INVALID FORMAT`, {
//       header: authHeader
//     });

//     return res.status(401).json({
//       success: false,
//       message: "Invalid auth format",
//       code: "INVALID_FORMAT",
//       requestId
//     });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.ACCESS_SECRET);

//     req.user = decoded;

//     console.log(`[${requestId}] AUTH SUCCESS`, {
//       userId: decoded.id,
//       role: decoded.role
//     });

//     next();
//   } catch (error) {
//     console.error(`[${requestId}] TOKEN ERROR`, {
//       error: error.message,
//       name: error.name
//     });

//     if (error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         success: false,
//         message: "Access token expired",
//         code: "TOKEN_EXPIRED",
//         requestId
//       });
//     }

//     return res.status(401).json({
//       success: false,
//       message: "Invalid token",
//       code: "INVALID_TOKEN",
//       requestId
//     });
//   }
// };

// 🔹 1. Check cookie and Bearer
// export const verifyToken = (req, res, next) => {

//   let token;

//   // 🔹 1. Check cookie
//   if (req.cookies?.accessToken) {
//     token = req.cookies.accessToken;
//   }

//   // 🔹 2. Check header (mobile)
//   else if (req.headers.authorization?.startsWith("Bearer ")) {
//     token = req.headers.authorization.split(" ")[1];
//   }

//   if (!token) {
//     return res.status(401).json({
//       message: "No token",
//       code: "NO_TOKEN"
//     });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
//     req.user = decoded;
//     next();

//   } catch (err) {

//     if (err.name === "TokenExpiredError") {
//       return res.status(401).json({
//         code: "TOKEN_EXPIRED"
//       });
//     }

//     return res.status(401).json({
//       message: "Invalid token",
//       code: "INVALID_TOKEN"
//     });
//   }
// };
