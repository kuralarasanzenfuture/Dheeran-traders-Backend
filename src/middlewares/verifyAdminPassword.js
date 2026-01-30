import bcrypt from "bcryptjs";
import db from "../config/db.js";

export const verifyAdminPassword = async (req, res, next) => {
  const { adminPassword } = req.body;

  if (!adminPassword) {
    return res.status(400).json({ message: "Admin password required" });
  }

  const [rows] = await db.query(
    "SELECT password FROM users WHERE id = ?",
    [req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "Admin not found" });
  }

  const isMatch = await bcrypt.compare(adminPassword, rows[0].password);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid admin password" });
  }

  next();
};
