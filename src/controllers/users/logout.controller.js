import db from "../../config/db.js";


/* ------------------------------------------------
LOGOUT USER
------------------------------------------------ */

// export const logoutUser = async (req, res) => {
//   try {
//     const { user_id } = req.body;

//     if (!user_id) {
//       return res.status(400).json({
//         message: "user_id required",
//       });
//     }

//     // await db.query(
//     //   `INSERT INTO login_history
//     //    (user_id,ip_address,user_agent,status,logout_time)
//     //    VALUES (?,?,?,?,NOW())`,
//     //   [
//     //     user_id,
//     //     req.ip,
//     //     req.headers["user-agent"],
//     //     "LOGOUT"
//     //   ]
//     // );

//     await db.query(
//       `UPDATE login_history
//       SET logout_time = NOW(),
//       status = 'LOGOUT'
//       WHERE user_id = ?
//       AND logout_time IS NULL
//       ORDER BY id DESC
//       LIMIT 1`,
//       [user_id, req.ip, req.headers["user-agent"], "LOGOUT"],
//     );

//     res.json({
//       message: "Logout success",
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: error.message,
//     });
//   }
// };

// LOGOUT USER (Revoke Token)

// export const logoutUser = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(400).json({
//         message: "Refresh token required",
//       });
//     }

//     await db.query(
//       `UPDATE user_refresh_tokens
//        SET revoked=1
//        WHERE refresh_token=?`,
//       [refreshToken],
//     );

//     res.json({
//       message: "Logout success",
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: error.message,
//     });
//   }
// };

// cookies and headers
// export const logoutUser = async (req, res) => {

//   const token =
//     req.cookies?.refreshToken || req.body.refreshToken;

//   if (token) {
//     await db.query(
//       `UPDATE user_refresh_tokens
//        SET revoked=1
//        WHERE refresh_token=?`,
//       [token]
//     );
//   }

//   // clear cookies for web
//   res.clearCookie("accessToken");
//   res.clearCookie("refreshToken");

//   res.json({ message: "Logged out" });
// };

// export const logoutUser = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(400).json({
//         message: "Refresh token required",
//       });
//     }

//     // 🔍 GET TOKEN DATA
//     const [rows] = await db.query(
//       `SELECT * FROM user_refresh_tokens
//        WHERE refresh_token=?`,
//       [refreshToken]
//     );

//     if (!rows.length) {
//       return res.status(400).json({
//         message: "Invalid token",
//       });
//     }

//     const tokenData = rows[0];

//     // ❌ deactivate token
//     await db.query(
//       `UPDATE user_refresh_tokens
//        SET is_active=0
//        WHERE refresh_token=?`,
//       [refreshToken]
//     );

//     // 📜 UPDATE LOGIN HISTORY (latest open session)
//     await db.query(
//       `UPDATE login_history
//        SET logout_time=NOW()
//        WHERE user_id=?
//        AND logout_time IS NULL
//        ORDER BY login_time DESC
//        LIMIT 1`,
//       [tokenData.user_id]
//     );

//     return res.json({
//       message: "Logout successful",
//     });

//   } catch (error) {
//     console.error("LOGOUT ERROR:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//     });
//   }
// };

// export const logoutUser = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(400).json({ message: "Token required" });
//     }

//     const [rows] = await db.query(
//       `SELECT * FROM user_refresh_tokens WHERE refresh_token=?`,
//       [refreshToken],
//     );

//     if (!rows.length) {
//       return res.status(400).json({ message: "Invalid token" });
//     }

//     const sessionId = rows[0].session_id;
//     const userId = rows[0].user_id;

//     // 🔒 deactivate only this session
//     await db.query(
//       `UPDATE user_refresh_tokens 
//        SET is_active=0 
//        WHERE session_id=?`,
//       [sessionId],
//     );

//     // 📜 update logout history
//     await db.query(
//       `UPDATE login_history
//        SET logout_time=NOW()
//        WHERE session_id=? AND logout_time IS NULL`,
//       [sessionId],
//     );

//     res.json({ message: "Logged out from this device" });
//   } catch (err) {
//     res.status(500).json({ message: "Internal server error", error: err.message });
//   }
// };
// -------------------------------------------------
export const logoutUser = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { refreshToken } = req.body;
    const userId = req.user.id;

    if (!refreshToken) {
      return res.status(400).json({ message: "Token required" });
    }

    const [rows] = await conn.query(
      `SELECT * FROM user_refresh_tokens 
       WHERE refresh_token=? AND is_active=1`,
      [refreshToken]
    );

    if (!rows.length) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const tokenData = rows[0];

    if (tokenData.user_id !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE user_refresh_tokens 
       SET is_active=0 
       WHERE session_id=?`,
      [tokenData.session_id]
    );

    await conn.query(
      `UPDATE login_history
       SET logout_time=NOW()
       WHERE session_id=? AND logout_time IS NULL`,
      [tokenData.session_id]
    );

    await conn.commit();

    res.json({ message: "Logged out from this device" });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: "Internal server error" });
  } finally {
    conn.release();
  }
};

// export const logoutAllDevices = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     await db.query(
//       `UPDATE user_refresh_tokens
//        SET revoked=1
//        WHERE user_id=?`,
//       [userId],
//     );

//     res.json({
//       message: "All devices logged out",
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: error.message,
//     });
//   }
// };

// export const logoutAllDevices = async (req, res) => {
//   try {
//     const userId = req.user.id;

//   await db.query(
//     `UPDATE user_refresh_tokens 
//      SET is_active=0 
//      WHERE user_id=?`,
//     [userId],
//   );

//   await db.query(
//     `UPDATE login_history
//      SET logout_time=NOW()
//      WHERE user_id=? AND logout_time IS NULL`,
//     [userId],
//   );

//   res.json({ message: "Logged out from all devices" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
// ----------------------------------------------------------

export const logoutAllDevices = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const userId = req.user.id;

    await conn.beginTransaction();

    // 🔥 kill refresh tokens
    await conn.query(
      `UPDATE user_refresh_tokens 
       SET is_active=0 
       WHERE user_id=?`,
      [userId]
    );

    // 🔥 kill access tokens (IMPORTANT)
    await conn.query(
      `UPDATE users_roles 
       SET token_version = token_version + 1 
       WHERE id=?`,
      [userId]
    );

    // 📜 update history
    await conn.query(
      `UPDATE login_history
       SET logout_time=NOW()
       WHERE user_id=? AND logout_time IS NULL`,
      [userId]
    );

    await conn.commit();

    res.json({ message: "Logged out from all devices" });

  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
};

