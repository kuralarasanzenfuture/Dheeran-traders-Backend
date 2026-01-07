import db from "../config/db.js";
import jwt from "jsonwebtoken";


export const adminLogin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({
        message: "Username/email and password required",
      });
    }

    // 🔹 Fetch admin WITHOUT case condition
    const [rows] = await db.query(
      `
      SELECT * FROM AdminLogin
      WHERE role = 'admin'
      LIMIT 1
      `
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const admin = rows[0];

    // 🔒 STRICT CASE-SENSITIVE VALIDATION (BACKEND ONLY)

    const usernameMatch =
      username && admin.username === username;

    const emailMatch =
      email && admin.email === email;

    const passwordMatch =
      admin.password === password;

    if (!((usernameMatch || emailMatch) && passwordMatch)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ JWT
    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Admin login successful",
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

