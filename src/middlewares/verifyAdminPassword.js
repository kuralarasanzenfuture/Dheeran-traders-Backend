import bcrypt from "bcryptjs";
import db from "../config/db.js";

// export const verifyAdminPassword = async (req, res, next) => {
//   const { adminPassword } = req.body;

//   if (!adminPassword) {
//     return res.status(400).json({ message: "Admin password required" });
//   }

//   const [rows] = await db.query(
//     "SELECT password FROM users WHERE id = ?",
//     [req.user.id]
//   );

//   if (!rows.length) {
//     return res.status(404).json({ message: "Admin not found" });
//   }

//   const isMatch = await bcrypt.compare(adminPassword, rows[0].password);

//   if (!isMatch) {
//     return res.status(401).json({ message: "Invalid admin password" });
//   }

//   next();
// };

export const verifyAdminPassword = async (req, res, next) => {
  try {
    const { adminPassword } = req.body;

    if (!adminPassword) {
      return res.status(400).json({ message: "Admin password required" });
    }

    // 🔎 Find ADMIN user only
    const [admins] = await db.query(
      "SELECT id, password FROM users WHERE role = 'admin'"
    );

    if (!admins.length) {
      return res.status(500).json({ message: "No admin account found" });
    }

    let isValid = false;

    // 🔐 Compare entered password with all admin accounts
    for (const admin of admins) {
      const match = await bcrypt.compare(adminPassword, admin.password);
      if (match) {
        isValid = true;
        break;
      }
    }

    if (!isValid) {
      return res.status(401).json({ message: "Invalid admin password" });
    }

    // ✅ Admin password correct
    next();

  } catch (error) {
    console.error("Admin verify error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
