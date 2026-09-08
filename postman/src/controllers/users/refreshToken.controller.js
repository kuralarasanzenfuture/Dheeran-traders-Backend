import jwt from "jsonwebtoken";
import db from "../../config/db.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// REFRESH TOKEN API (Validate from DB)

// export const refreshToken = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(401).json({
//         message: "Refresh token required",
//       });
//     }

//     const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

//     const [rows] = await db.query(
//       `SELECT * FROM user_refresh_tokens
//        WHERE refresh_token=? AND revoked=0`,
//       [refreshToken],
//     );

//     if (!rows.length) {
//       return res.status(403).json({
//         message: "Refresh token revoked",
//       });
//     }

//     const accessToken = jwt.sign({ id: decoded.id }, ACCESS_SECRET, {
//       expiresIn: "15m",
//     });

//     res.json({
//       accessToken,
//     });
//   } catch (error) {
//     res.status(403).json({
//       message: "Invalid refresh token",
//     });
//   }
// };

// export const refreshToken = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(401).json({ message: "Refresh token required" });
//     }

//     // verify token
//     const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

//     // check in DB + expiry + not revoked
//     const [rows] = await db.query(
//       `SELECT * FROM user_refresh_tokens
//        WHERE refresh_token=?
//        AND revoked=0
//        AND expires_at > NOW()`,
//       [refreshToken]
//     );

//     if (!rows.length) {
//       return res.status(403).json({
//         message: "Invalid or expired refresh token",
//       });
//     }

//     // get user
//     const [users] = await db.query(
//       `SELECT id, role_id FROM users_roles WHERE id=?`,
//       [decoded.id]
//     );

//     if (!users.length) {
//       return res.status(401).json({ message: "User not found" });
//     }

//     const user = users[0];

//     // 🔁 ROTATE refresh token (IMPORTANT)
//     const newRefreshToken = jwt.sign(
//       { id: user.id },
//       REFRESH_SECRET,
//       { expiresIn: "7d" }
//     );

//     // revoke old
//     await db.query(
//       `UPDATE user_refresh_tokens SET revoked=1 WHERE refresh_token=?`,
//       [refreshToken]
//     );

//     // insert new
//     await db.query(
//       `INSERT INTO user_refresh_tokens
//        (user_id,refresh_token,expires_at)
//        VALUES (?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))`,
//       [user.id, newRefreshToken]
//     );

//     // new access token
//     const newAccessToken = jwt.sign(
//       { id: user.id, role_id: user.role_id },
//       ACCESS_SECRET,
//       { expiresIn: "15m" }
//     );

//     res.json({
//       accessToken: newAccessToken,
//       refreshToken: newRefreshToken,
//     });

//   } catch (error) {
//     return res.status(403).json({
//       message: "Invalid refresh token",
//     });
//   }
// };

// cookies and body
// export const refreshToken = async (req, res) => {
//   try {

//     // 🔹 cookie OR body
//     const token =
//       req.cookies?.refreshToken || req.body.refreshToken;

//     if (!token) {
//       return res.status(401).json({
//         message: "Refresh token required"
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

//     const [rows] = await db.query(
//       `SELECT * FROM user_refresh_tokens
//        WHERE refresh_token=?
//        AND revoked=0
//        AND expires_at > NOW()`,
//       [token]
//     );

//     if (!rows.length) {
//       return res.status(403).json({
//         message: "Invalid refresh token"
//       });
//     }

//     const [users] = await db.query(
//       `SELECT id, role_id FROM users_roles WHERE id=?`,
//       [decoded.id]
//     );

//     const user = users[0];

//     const newAccessToken = generateAccessToken(user);
//     const newRefreshToken = generateRefreshToken(user);

//     // revoke old
//     await db.query(
//       `UPDATE user_refresh_tokens SET revoked=1 WHERE refresh_token=?`,
//       [token]
//     );

//     // insert new
//     await db.query(
//       `INSERT INTO user_refresh_tokens
//        (user_id, refresh_token, expires_at)
//        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
//       [user.id, newRefreshToken]
//     );

//     const isMobile = req.headers["x-client-type"] === "mobile";

//     // 🔥 WEB → cookies
//     if (!isMobile) {
//       res.cookie("accessToken", newAccessToken, {
//         httpOnly: true,
//         secure: true,
//         sameSite: "Strict",
//         maxAge: 15 * 60 * 1000
//       });

//       res.cookie("refreshToken", newRefreshToken, {
//         httpOnly: true,
//         secure: true,
//         sameSite: "Strict",
//         maxAge: 7 * 24 * 60 * 60 * 1000
//       });

//       return res.json({ message: "Token refreshed" });
//     }

//     // 🔥 MOBILE
//     res.json({
//       accessToken: newAccessToken,
//       refreshToken: newRefreshToken
//     });

//   } catch (err) {
//     res.status(403).json({ message: "Invalid refresh token" });
//   }
// };

// single token refresh
// export const refreshToken = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(401).json({
//         message: "Refresh token required",
//       });
//     }

//     // 🔍 CHECK DB FIRST
//     const [rows] = await db.query(
//       `SELECT * FROM user_refresh_tokens
//        WHERE refresh_token=?`,
//       [refreshToken]
//     );

//     if (!rows.length) {
//       return res.status(403).json({
//         message: "Invalid refresh token",
//       });
//     }

//     const tokenData = rows[0];

//     // 🚨 TOKEN REUSE DETECTION
//     if (!tokenData.is_active) {
//       // kill all sessions
//       await db.query(
//         `UPDATE user_refresh_tokens
//          SET is_active=0
//          WHERE user_id=?`,
//         [tokenData.user_id]
//       );

//       return res.status(403).json({
//         message: "Token reuse detected. All sessions revoked.",
//       });
//     }

//     // ⏳ EXPIRY CHECK
//     if (new Date(tokenData.expires_at) < new Date()) {
//       return res.status(403).json({
//         message: "Refresh token expired",
//       });
//     }

//     // 🔐 VERIFY JWT
//     let decoded;
//     try {
//       decoded = jwt.verify(refreshToken, REFRESH_SECRET);
//     } catch {
//       return res.status(403).json({
//         message: "Invalid token signature",
//       });
//     }

//     // 👤 USER CHECK
//     const [users] = await db.query(
//       `SELECT id, role_id FROM users_roles WHERE id=?`,
//       [decoded.id]
//     );

//     if (!users.length) {
//       return res.status(401).json({
//         message: "User not found",
//       });
//     }

//     const user = users[0];

//     // 🔁 ROTATE TOKENS
//     const newRefreshToken = jwt.sign(
//       { id: user.id },
//       REFRESH_SECRET,
//       { expiresIn: "7d" }
//     );

//     const newAccessToken = jwt.sign(
//       { id: user.id, role_id: user.role_id },
//       ACCESS_SECRET,
//       { expiresIn: "15m" }
//     );

//     // ❌ deactivate old
//     await db.query(
//       `UPDATE user_refresh_tokens
//        SET is_active=0
//        WHERE refresh_token=?`,
//       [refreshToken]
//     );

//     // ✅ insert new
//     await db.query(
//       `INSERT INTO user_refresh_tokens
//        (user_id, refresh_token, ip_address, user_agent, expires_at)
//        VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
//       [
//         user.id,
//         newRefreshToken,
//         req.ip,
//         req.headers["user-agent"] || "unknown",
//       ]
//     );

//     return res.json({
//       accessToken: newAccessToken,
//       refreshToken: newRefreshToken,
//     });

//   } catch (error) {
//     console.error("REFRESH ERROR:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//     });
//   }
// };

// export const refreshToken = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(401).json({ message: "Token required" });
//     }

//     const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

//     const [rows] = await db.query(
//       `SELECT * FROM user_refresh_tokens
//        WHERE refresh_token=? AND is_active=1`,
//       [refreshToken]
//     );

//     if (!rows.length) {
//       return res.status(403).json({ message: "Invalid token" });
//     }

//     const tokenData = rows[0];

//     // 🚨 IMPORTANT: session match
//     if (tokenData.session_id !== decoded.session_id) {
//       return res.status(403).json({ message: "Session mismatch" });
//     }

//     const newRefreshToken = jwt.sign(
//       { id: decoded.id, session_id: decoded.session_id },
//       REFRESH_SECRET,
//       { expiresIn: "7d" }
//     );

//     const newAccessToken = jwt.sign(
//       { id: decoded.id, session_id: decoded.session_id },
//       ACCESS_SECRET,
//       { expiresIn: "15m" }
//     );

//     // rotate ONLY this session
//     await db.query(
//       `UPDATE user_refresh_tokens
//        SET is_active=0
//        WHERE refresh_token=?`,
//       [refreshToken]
//     );

//     await db.query(
//       `INSERT INTO user_refresh_tokens
//        (user_id, session_id, refresh_token, ip_address, user_agent, expires_at)
//        VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
//       [
//         decoded.id,
//         decoded.session_id,
//         newRefreshToken,
//         req.ip,
//         req.headers["user-agent"],
//       ]
//     );

//     res.json({
//       accessToken: newAccessToken,
//       refreshToken: newRefreshToken
//     });

//   } catch (err) {
//     res.status(403).json({ message: "Invalid token" });
//   }
// };

// FINAL REFRESH TOKEN WITH PERMISSIONS
// | Problem                  | Solution               |
// | ------------------------ | ---------------------- |
// | Permission changed in DB | ✅ Reflected on refresh |
// | User role changed        | ✅ Updated instantly    |
// | No re-login needed       | ✅ Done                 |
// | Old token stale          | ❌ Removed              |

// FLOW NOW

// LOGIN → load permissions → token issued

// Later...

// ADMIN changes permission

// User calls refreshToken →

// → reload permissions
// → new accessToken
// → updated access instantly ✅

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Token required" });
    }

    // ✅ Verify token
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    // ✅ Check DB token
    const [rows] = await db.query(
      `SELECT * FROM user_refresh_tokens 
       WHERE refresh_token=? AND is_active=1`,
      [refreshToken],
    );

    if (!rows.length) {
      return res.status(403).json({ message: "Invalid token" });
    }

    const tokenData = rows[0];

    // ✅ Session validation
    if (tokenData.session_id !== decoded.session_id) {
      return res.status(403).json({ message: "Session mismatch" });
    }

    // ====================================================
    // 🔥 NEW: LOAD USER + PERMISSIONS (IMPORTANT)
    // ====================================================

    const [[user]] = await db.query(
      `SELECT id, role_id, status FROM users_roles WHERE id=?`,
      [decoded.id],
    );

    if (!user || user.status !== "active") {
      return res.status(403).json({ message: "User inactive" });
    }

    // 🔥 Load permissions
    const [permRows] = await db.query(
      `
      SELECT 
        m.code AS module_code,
        ma.action_code,
        COALESCE(up.is_allowed, rp.is_allowed, FALSE) AS is_allowed
      FROM modules m
      JOIN module_actions ma ON ma.module_id = m.id

      LEFT JOIN role_permissions rp 
        ON rp.module_id = m.id 
        AND rp.action_id = ma.id 
        AND rp.role_id = ?

      LEFT JOIN user_permissions up
        ON up.module_id = m.id 
        AND up.action_id = ma.id 
        AND up.user_id = ?
    `,
      [user.role_id, user.id],
    );

    // 🔥 Convert to map
    const permissions = {};
    permRows.forEach((p) => {
      permissions[`${p.module_code}_${p.action_code}`] = p.is_allowed === 1;
    });

    // ====================================================
    // 🔄 TOKEN ROTATION
    // ====================================================

    const newRefreshToken = jwt.sign(
      { id: user.id, session_id: decoded.session_id },
      REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES },
    );

    const newAccessToken = jwt.sign(
      {
        id: user.id,
        role_id: user.role_id,
        session_id: decoded.session_id,
        permissions, // 🔥 updated permissions
      },
      ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRES },
    );

    // ====================================================
    // 🔄 UPDATE TOKENS (ROTATION)
    // ====================================================

    await db.query(
      `UPDATE user_refresh_tokens 
       SET is_active=0 
       WHERE refresh_token=?`,
      [refreshToken],
    );

    await db.query(
      `INSERT INTO user_refresh_tokens
       (user_id, session_id, refresh_token, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [
        user.id,
        decoded.session_id,
        newRefreshToken,
        req.ip,
        req.headers["user-agent"] || "unknown",
      ],
    );

    // ====================================================
    // ✅ RESPONSE
    // ====================================================

    res.json({
      message: "Token refreshed",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      permissions, // 🔥 optional (frontend update)
    });
  } catch (err) {
    console.error(err);
    res.status(403).json({ message: "Invalid token", error: err.message });
  }
};
