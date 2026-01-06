// import db from "../config/db.js";

// export const adminLogin = async (req, res) => {
//   try {
//     const { username, email, password } = req.body;

//     if ((!username && !email) || !password) {
//       return res.status(400).json({
//         message: "Username/email and password required",
//       });
//     }

//     // 🔍 Find admin by username OR email
//     const [rows] = await db.query(
//       `
//       SELECT * FROM AdminLogin
//       WHERE role = 'admin'
//       AND (username = ? OR email = ?)
//       LIMIT 1
//       `,
//       [username, email]
//     );

//     if (!rows.length) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const admin = rows[0];

//     // ❗ Plain text password check
//     if (admin.password !== password) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     res.json({
//       message: "Admin login successful",
//       admin: {
//         id: admin.id,
//         username: admin.username,
//         email: admin.email,
//         role: admin.role,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

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

    // 🔍 Find admin
    const [rows] = await db.query(
      `
      SELECT * FROM AdminLogin
      WHERE role = 'admin'
      AND (username = ? OR email = ?)
      LIMIT 1
      `,
      [username, email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const admin = rows[0];

    // ❗ Plain text password check
    if (admin.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ GENERATE JWT TOKEN
    const token = jwt.sign(
      {
        id: admin.id,
        role: admin.role,
        email: admin.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
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

