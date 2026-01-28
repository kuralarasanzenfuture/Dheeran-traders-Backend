import bcrypt from "bcryptjs";
import db from "../config/db.js";
import { generateToken } from "../utils/jwt.js";

/**
 * REGISTER
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const [exists] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (exists.length) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    res.status(201).json({
      token: generateToken({ id: result.insertId }),
      user: {
        id: result.insertId,
        username,
        email,
        role: "user",
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * LOGIN
 */
// export const login = async (req, res, next) => {
//   try {
//     const { email, password } = req.body;

//     const [users] = await db.query(
//       "SELECT * FROM users WHERE email = ?",
//       [email]
//     );

//     if (!users.length) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const user = users[0];

//     const match = await bcrypt.compare(password, user.password);
//     if (!match) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     await db.query(
//       "UPDATE users SET last_login_at = NOW() WHERE id = ?",
//       [user.id]
//     );

//     delete user.password;

//     res.json({
//       token: generateToken({ id: user.id }),
//       user,
//     });
//   } catch (err) {
//     next(err);
//   }
// };


export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    // identifier = email OR username

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Email/Username and password required" });
    }

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [identifier, identifier]
    );

    if (!users.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await db.query(
      "UPDATE users SET last_login_at = NOW() WHERE id = ?",
      [user.id]
    );

    delete user.password;

    res.json({
      token: generateToken({ id: user.id }),
      user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET ALL USERS (ADMIN)
 */
export const getUsers = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, email, role, created_at FROM users"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET PROFILE
 */
export const getProfile = async (req, res) => {
  res.json(req.user);
};

/**
 * DELETE USER (ADMIN)
 */
export const deleteUser = async (req, res, next) => {
  try {
    await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE USER ROLE (ADMIN ONLY)
 */
// export const updateUserRole = async (req, res, next) => {
//   try {
//     const { role } = req.body;
//     const { id } = req.params;

//     if (!["admin", "user"].includes(role)) {
//       return res.status(400).json({ message: "Invalid role" });
//     }

//     await db.query(
//       "UPDATE users SET role = ? WHERE id = ?",
//       [role, id]
//     );

//     res.json({ message: "Role updated successfully" });
//   } catch (err) {
//     next(err);
//   }
// };

export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // update role
    const [result] = await db.query(
      "UPDATE users SET role = ? WHERE id = ?",
      [role, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // fetch updated user (exclude password)
    const [rows] = await db.query(
      `SELECT id, username, email, role, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );

    res.json({
      message: "Role updated successfully",
      user: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

