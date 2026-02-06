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



