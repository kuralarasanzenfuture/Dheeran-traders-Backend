import db from "../../../config/db.js";
import bcrypt from "bcryptjs";
import e from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const ACCESS_SECRET_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const REFRESH_SECRET_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES;

/* =========================================
   🔧 HELPER: Detect client type
========================================= */
const isMobileClient = (req) => {
  return req.headers["x-client-type"] === "mobile";
};

/* =========================================
   🔧 HELPER: Set Cookies (WEB)
========================================= */
const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false, // 👉 TRUE in production (HTTPS)
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

/* =========================================
   🔐 LOGIN
========================================= */
// export const loginUser = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     const isMobile = isMobileClient(req);

//     let { login_id, password } = req.body;

//     if (!login_id || !password) {
//       throw new Error("Required fields missing");
//     }

//     login_id = login_id.trim().toLowerCase();

//     const [[user]] = await conn.query(
//       `SELECT * FROM users_roles
//        WHERE LOWER(username)=? OR LOWER(email)=? OR phone=?`,
//       [login_id, login_id, login_id]
//     );

//     if (!user) throw new Error("Invalid credentials");

//     if (user.status !== "active") {
//       throw new Error("User inactive");
//     }

//     const valid = await bcrypt.compare(password, user.password);
//     if (!valid) throw new Error("Invalid credentials");

//     const sessionId = uuidv4();

//     const accessToken = jwt.sign(
//       {
//         id: user.id,
//         role_id: user.role_id,
//         token_version: user.token_version,
//         session_id: sessionId,
//       },
//       ACCESS_SECRET,
//       { expiresIn: "15m" }
//     );

//     const refreshToken = jwt.sign(
//       { id: user.id, session_id: sessionId },
//       REFRESH_SECRET,
//       { expiresIn: "7d" }
//     );

//     await conn.query(
//   `INSERT INTO user_refresh_tokens
//    (user_id, session_id, refresh_token, ip_address, user_agent, expires_at)
//    VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
//   [
//     user.id,
//     sessionId,
//     refreshToken,
//     req.ip,
//     req.headers["user-agent"] || "unknown",
//   ]
// );

//     /* 🔥 RESPONSE */
//     if (isMobile) {
//       return res.json({
//         success: true,
//         accessToken,
//         refreshToken,
//       });
//     } else {
//       setAuthCookies(res, accessToken, refreshToken);

//       return res.json({
//         success: true,
//         message: "Login success",
//         accessToken,
//       });
//     }

//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   } finally {
//     conn.release();
//   }
// };

export const loginUser = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const isMobile = isMobileClient(req);

    let { login_id, password } = req.body;

    if (!login_id || !password) {
      throw new Error("Required fields missing");
    }

    login_id = login_id.trim().toLowerCase();

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      req.ip;

    const userAgent = req.headers["user-agent"] || "unknown";

    /* =========================
       1️⃣ GET USER + ROLE
    ========================= */
    const [[user]] = await conn.query(
      `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.phone,
        u.password,
        u.role_id,
        u.status,
        u.token_version,
        u.last_login_at,

        r.role_name,
        r.status AS role_status

      FROM users_roles u
      JOIN role_based r ON u.role_id = r.id

      WHERE LOWER(u.username)=? 
         OR LOWER(u.email)=? 
         OR u.phone=?
      `,
      [login_id, login_id, login_id],
    );

    if (!user) throw new Error("Invalid credentials");

    if (user.status !== "active") {
      throw new Error("User inactive");
    }

    if (user.role_status !== "active") {
      throw new Error("Role inactive");
    }

    /* =========================
       2️⃣ PASSWORD CHECK
    ========================= */
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid credentials");

    /* =========================
       3️⃣ SUSPICIOUS LOGIN
    ========================= */
    const [lastLogins] = await conn.query(
      `
      SELECT ip_address, user_agent 
      FROM login_history 
      WHERE user_id=? 
      ORDER BY login_time DESC 
      LIMIT 5
      `,
      [user.id],
    );

    const isKnownDevice = lastLogins.some(
      (l) => l.ip_address === ip && l.user_agent === userAgent,
    );

    const isSuspicious = !isKnownDevice && lastLogins.length >= 3;

    /* =========================
       4️⃣ LOAD PERMISSIONS
    ========================= */
    const [permRows] = await conn.query(
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

    const permissions = {};
    permRows.forEach((p) => {
      permissions[`${p.module_code}_${p.action_code}`] = p.is_allowed === 1;
    });

    /* =========================
       5️⃣ GENERATE TOKENS
    ========================= */
    const sessionId = uuidv4();

    const accessToken = jwt.sign(
      {
        id: user.id,
        role_id: user.role_id,
        role: user.role_name,
        token_version: user.token_version,
        session_id: sessionId,
        permissions,
      },
      ACCESS_SECRET,
      //   { expiresIn: "15m" }
      { expiresIn: ACCESS_SECRET_EXPIRES || "15m" },
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        session_id: sessionId,
      },
      REFRESH_SECRET,
    //   { expiresIn: "7d" },
      { expiresIn: REFRESH_SECRET_EXPIRES || "7d" },
    );

    /* =========================
       6️⃣ SAVE SESSION
    ========================= */
    await conn.beginTransaction();

    await conn.query(
      `
      INSERT INTO user_refresh_tokens
      (user_id, session_id, refresh_token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))
      `,
      [user.id, sessionId, refreshToken, ip, userAgent],
    );

    await conn.query(
      `
      INSERT INTO login_history
      (user_id, session_id, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
      `,
      [user.id, sessionId, ip, userAgent],
    );

    await conn.query(`UPDATE users_roles SET last_login_at=NOW() WHERE id=?`, [
      user.id,
    ]);

    await conn.commit();

    /* =========================
       7️⃣ RESPONSE
    ========================= */
    if (isMobile) {
      return res.json({
        success: true,
        message: "Login success",
        accessToken,
        expiresIn: ACCESS_SECRET_EXPIRES,
        refreshToken,
        sessionId,

        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role_id: user.role_id,
          role_name: user.role_name,
        },

        permissions,
        last_login_at: new Date(),
        is_suspicious: isSuspicious,
      });
    } else {
      setAuthCookies(res, accessToken, refreshToken);

      return res.json({
        success: true,
        message: "Login success",
        accessToken,
        sessionId,

        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role_id: user.role_id,
          role_name: user.role_name,
        },

        permissions,
        last_login_at: new Date(),
        is_suspicious: isSuspicious,
      });
    }
  } catch (err) {
    await conn.rollback();

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    conn.release();
  }
};

/* =========================================
   🔄 REFRESH TOKEN
========================================= */
export const refreshToken = async (req, res) => {
  try {
    const isMobile = isMobileClient(req);

    const oldRefreshToken = isMobile
      ? req.body.refreshToken
      : req.cookies?.refreshToken;

    if (!oldRefreshToken) {
      throw new Error("Token required");
    }

    const decoded = jwt.verify(oldRefreshToken, REFRESH_SECRET);

    const [[tokenData]] = await db.query(
      `SELECT * FROM user_refresh_tokens 
       WHERE refresh_token=? AND is_active=1`,
      [oldRefreshToken],
    );

    if (!tokenData) throw new Error("Invalid session");

    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
        session_id: decoded.session_id,
      },
      ACCESS_SECRET,
    //   { expiresIn: "15m" },
      { expiresIn: ACCESS_SECRET_EXPIRES || "15m" },
    );

    const newRefreshToken = jwt.sign(
      {
        id: decoded.id,
        session_id: decoded.session_id,
      },
      REFRESH_SECRET,
    //   { expiresIn: "7d" },
      { expiresIn: REFRESH_SECRET_EXPIRES || "7d" },
    );

    // 🔄 Rotate token
    await db.query(
      `UPDATE user_refresh_tokens SET is_active=0 WHERE refresh_token=?`,
      [oldRefreshToken],
    );

    await db.query(
      `INSERT INTO user_refresh_tokens 
   (user_id, session_id, refresh_token, ip_address, user_agent, expires_at) 
   VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [
        decoded.id,
        decoded.session_id,
        newRefreshToken,
        req.ip,
        req.headers["user-agent"] || "unknown",
      ],
    );

    if (isMobile) {
      return res.json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } else {
      setAuthCookies(res, newAccessToken, newRefreshToken);

      return res.json({
        success: true,
        message: "Token refreshed",
      });
    }
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================
   🚪 LOGOUT (Single Device)
========================================= */
export const logoutUser = async (req, res) => {
  try {
    const isMobile = isMobileClient(req);

    const refreshToken = isMobile
      ? req.body.refreshToken
      : req.cookies?.refreshToken;

    if (!refreshToken) throw new Error("No session");

    await db.query(
      `UPDATE user_refresh_tokens 
       SET is_active=0 
       WHERE refresh_token=?`,
      [refreshToken],
    );

    if (!isMobile) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
    }

    return res.json({
      success: true,
      message: "Logged out",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================
   🌍 LOGOUT ALL DEVICES
========================================= */
export const logoutAllDevices = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    await conn.beginTransaction();

    await conn.query(
      `UPDATE user_refresh_tokens 
       SET is_active=0 
       WHERE user_id=?`,
      [userId],
    );

    await conn.query(
      `UPDATE users_roles 
       SET token_version = token_version + 1 
       WHERE id=?`,
      [userId],
    );

    await conn.commit();

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (err) {
    await conn.rollback();

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    conn.release();
  }
};
