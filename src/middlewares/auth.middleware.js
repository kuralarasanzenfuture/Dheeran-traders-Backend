import jwt from "jsonwebtoken";
import db from "../config/db.js";

export const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      "SELECT id, username, email, role FROM users WHERE id = ?",
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

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


export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Access token required",
      code: "NO_TOKEN"
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Invalid auth format",
      code: "INVALID_FORMAT"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);

    req.user = decoded; // includes permission
    next();

  } catch (error) {

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access token expired",
        code: "TOKEN_EXPIRED"
      });
    }

    return res.status(401).json({
      message: "Invalid token",
      code: "INVALID_TOKEN"
    });
  }
};


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