import db from "../../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;


// export const createUser = async (req, res) => {
//   try {
//     let { username, email, phone, password, role_id } = req.body;

//     if (!username || !phone || !password || !role_id) {
//       return res.status(400).json({
//         message: "Username, phone, password and role required",
//       });
//     }

//     username = username.trim().toLowerCase();
//     email = email ? email.trim().toLowerCase() : null;

//     // check role
//     const [role] = await db.query(
//       `SELECT role_name FROM role_based WHERE id=?`,
//       [role_id],
//     );

//     if (!role.length) {
//       return res.status(400).json({ message: "Invalid role" });
//     }

//     // only one admin allowed
//     if (role[0].role_name === "ADMIN") {
//       const [admin] = await db.query(
//         `SELECT id FROM users_roles WHERE role_id=?`,
//         [role_id],
//       );

//       if (admin.length > 0) {
//         return res.status(400).json({
//           message: "Only one ADMIN allowed",
//         });
//       }
//     }

//     const errors = {};

//     // username check
//     const [usernameExists] = await db.query(
//       `SELECT id FROM users_roles WHERE LOWER(username)=?`,
//       [username],
//     );

//     if (usernameExists.length) {
//       errors.username = "Username already exists";
//     }

//     // email check
//     if (email) {
//       const [emailExists] = await db.query(
//         `SELECT id FROM users_roles WHERE LOWER(email)=?`,
//         [email],
//       );

//       if (emailExists.length) {
//         errors.email = "Email already exists";
//       }
//     }

//     // phone check
//     if (phone) {
//       const [phoneExists] = await db.query(
//         `SELECT id FROM users_roles WHERE phone=?`,
//         [phone],
//       );

//       if (phoneExists.length) {
//         errors.phone = "Phone already exists";
//       }
//     }

//     if (Object.keys(errors).length > 0) {
//       return res.status(400).json({ errors });
//     }

//     const hash = await bcrypt.hash(password, 10);

//     const [user] = await db.query(
//       `INSERT INTO users_roles
//        (username,email,phone,password,role_id)
//        VALUES (?,?,?,?,?)`,
//       [username, email, phone, hash, role_id],
//     );

//     res.json({
//       message: "User created successfully",
//       user_id: user.insertId,
//       username,
//       email,
//       phone,
//       role: role[0].role_name,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: error.message,
//     });
//   }
// };

export const createUser = async (req, res) => {
  try {
    let { username, email, phone, password, role_id } = req.body;

    if (!username || !phone || !password || !role_id) {
      return res.status(400).json({
        message: "Username, phone, password and role required",
      });
    }

    username = username.trim().toLowerCase();
    email = email ? email.trim().toLowerCase() : null;

    /* =========================
       🔍 CHECK ROLE + STATUS
    ========================= */
    const [role] = await db.query(
      `SELECT role_name, status FROM role_based WHERE id=?`,
      [role_id]
    );

    if (!role.length) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // 🔥 BLOCK INACTIVE ROLE
    if (role[0].status === "inactive") {
      return res.status(403).json({
        message: "This role is inactive. Cannot create user.",
      });
    }

    /* =========================
       🚫 ONLY ONE ADMIN
    ========================= */
    if (role[0].role_name === "ADMIN") {
      const [admin] = await db.query(
        `SELECT id FROM users_roles WHERE role_id=?`,
        [role_id]
      );

      if (admin.length > 0) {
        return res.status(400).json({
          message: "Only one ADMIN allowed",
        });
      }
    }

    const errors = {};

    /* =========================
       🔍 DUPLICATE CHECKS
    ========================= */

    const [usernameExists] = await db.query(
      `SELECT id FROM users_roles WHERE LOWER(username)=?`,
      [username]
    );

    if (usernameExists.length) {
      errors.username = "Username already exists";
    }

    if (email) {
      const [emailExists] = await db.query(
        `SELECT id FROM users_roles WHERE LOWER(email)=?`,
        [email]
      );

      if (emailExists.length) {
        errors.email = "Email already exists";
      }
    }

    const [phoneExists] = await db.query(
      `SELECT id FROM users_roles WHERE phone=?`,
      [phone]
    );

    if (phoneExists.length) {
      errors.phone = "Phone already exists";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    /* =========================
       🔐 PASSWORD HASH
    ========================= */
    const hash = await bcrypt.hash(password, 10);

    /* =========================
       ✅ INSERT USER
    ========================= */
    const [user] = await db.query(
      `INSERT INTO users_roles
       (username,email,phone,password,role_id)
       VALUES (?,?,?,?,?)`,
      [username, email, phone, hash, role_id]
    );

    res.json({
      message: "User created successfully",
      user_id: user.insertId,
      username,
      email,
      phone,
      role: role[0].role_name,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
