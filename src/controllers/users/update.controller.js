import db from "../../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;


export const updateUser = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.params.id;

    let { username, email, phone, password, role_id, status } = req.body;

    /* =========================
       0️⃣ AUTH CHECK
    ========================= */
    if (!req.user || req.user.role_id !== 1) {
      return res.status(403).json({
        message: "Only admin can update users",
      });
    }

    /* =========================
       1️⃣ VALIDATION
    ========================= */
    if (!username) {
      return res.status(400).json({
        message: "Username required",
      });
    }

    username = username.trim().toLowerCase();
    email = email ? email.trim().toLowerCase() : null;

    if (phone && !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Invalid phone number",
      });
    }

    if (status !== undefined && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    /* =========================
       2️⃣ GET USER
    ========================= */
    const [userArr] = await connection.query(
      `SELECT * FROM users_roles WHERE id=? FOR UPDATE`,
      [userId],
    );

    if (!userArr.length) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const existingUser = userArr[0];

    /* =========================
       3️⃣ GET ADMIN ROLE ID
    ========================= */
    const [adminRoleRow] = await connection.query(
      `SELECT id FROM role_based WHERE UPPER(role_name)='ADMIN' LIMIT 1`,
    );

    const adminRoleId = adminRoleRow[0]?.id;

    const isAdminUser = existingUser.role_id === adminRoleId;

    /* =========================
       4️⃣ ROLE HANDLING
    ========================= */

    // default fallback
    role_id = role_id !== undefined ? role_id : existingUser.role_id;
    status = status !== undefined ? status : existingUser.status;

    // validate role
    const [role] = await connection.query(
      `SELECT role_name FROM role_based WHERE id=?`,
      [role_id],
    );

    if (!role.length) {
      await connection.rollback();
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const newRoleName = role[0].role_name.toUpperCase();

    /* =========================
       5️⃣ ADMIN PROTECTION
    ========================= */

    if (isAdminUser) {
      // cannot change role
      if (role_id !== existingUser.role_id) {
        await connection.rollback();
        return res.status(400).json({
          message: "Cannot change ADMIN role",
        });
      }

      // cannot deactivate
      if (status === "inactive") {
        await connection.rollback();
        return res.status(400).json({
          message: "Cannot deactivate ADMIN",
        });
      }
    }

    // prevent creating second admin
    if (newRoleName === "ADMIN" && role_id !== existingUser.role_id) {
      const [adminCheck] = await connection.query(
        `SELECT COUNT(*) as count FROM users_roles WHERE role_id=?`,
        [adminRoleId],
      );

      if (adminCheck[0].count > 0) {
        await connection.rollback();
        return res.status(400).json({
          message: "Only one ADMIN allowed",
        });
      }
    }

    /* =========================
       6️⃣ UNIQUE VALIDATION
    ========================= */
    const errors = {};

    const [u1] = await connection.query(
      `SELECT id FROM users_roles WHERE LOWER(username)=? AND id != ?`,
      [username, userId],
    );
    if (u1.length) errors.username = "Username already exists";

    if (email) {
      const [u2] = await connection.query(
        `SELECT id FROM users_roles WHERE LOWER(email)=? AND id != ?`,
        [email, userId],
      );
      if (u2.length) errors.email = "Email already exists";
    }

    if (phone) {
      const [u3] = await connection.query(
        `SELECT id FROM users_roles WHERE phone=? AND id != ?`,
        [phone, userId],
      );
      if (u3.length) errors.phone = "Phone already exists";
    }

    if (Object.keys(errors).length > 0) {
      await connection.rollback();
      return res.status(400).json({ errors });
    }

    /* =========================
       7️⃣ PASSWORD
    ========================= */
    let hashedPassword = existingUser.password;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    /* =========================
       8️⃣ UPDATE
    ========================= */
    await connection.query(
      `UPDATE users_roles 
       SET username=?, email=?, phone=?, password=?, role_id=?, status=? 
       WHERE id=?`,
      [username, email, phone, hashedPassword, role_id, status, userId],
    );

    await connection.commit();

    res.json({
      message: "User updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      message: error.message,
    });
  } finally {
    connection.release();
  }
};