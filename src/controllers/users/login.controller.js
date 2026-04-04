import db from "../../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/* ------------------------------------------------
LOGIN USER
------------------------------------------------ */

// export const loginUser = async (req, res) => {
//   try {
//     let { username, password } = req.body;

//     if (!username || !password) {
//       return res.status(400).json({
//         message: "Username and password required",
//       });
//     }

//     username = username.toLowerCase();

//     const [users] = await db.query(
//       `SELECT * FROM users_roles WHERE username=?`,
//       [username],
//     );

//     if (!users.length) {
//       return res.status(401).json({
//         message: "Invalid credentials",
//       });
//     }

//     const user = users[0];

//     const valid = await bcrypt.compare(password, user.password);

//     if (!valid) {
//       return res.status(401).json({
//         message: "Invalid credentials",
//       });
//     }

//     // generate tokens
//     const accessToken = jwt.sign(
//       {
//         id: user.id,
//         role_id: user.role_id,
//       },
//       ACCESS_SECRET,
//       { expiresIn: "15m" },
//     );

//     const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, {
//       expiresIn: "7d",
//     });

//     // update last login
//     await db.query(
//       `UPDATE users_roles
//        SET last_login_at=NOW()
//        WHERE id=?`,
//       [user.id],
//     );

//     // login history
//     await db.query(
//       `INSERT INTO login_history
//        (user_id,ip_address,user_agent,status)
//        VALUES (?,?,?,?)`,
//       [user.id, req.ip, req.headers["user-agent"], "LOGIN"],
//     );

//     res.json({
//       message: "Login success",
//       accessToken,
//       refreshToken,
//       user: {
//         id: user.id,
//         username: user.username,
//         role_id: user.role_id,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const loginUser = async (req, res) => {
//   try {
//     let { username, password } = req.body;

//     if (!username || !password) {
//       return res.status(400).json({
//         message: "Username and password required",
//       });
//     }

//     username = username.toLowerCase();

//     const [users] = await db.query(
//       `SELECT * FROM users_roles WHERE username=?`,
//       [username],
//     );

//     if (!users.length) {
//       return res.status(401).json({
//         message: "Invalid credentials",
//       });
//     }

//     const user = users[0];

//     const valid = await bcrypt.compare(password, user.password);

//     if (!valid) {
//       return res.status(401).json({
//         message: "Invalid credentials",
//       });
//     }

//     const accessToken = jwt.sign(
//       { id: user.id, role_id: user.role_id },
//       ACCESS_SECRET,
//       { expiresIn: "15m" },
//     );

//     const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, {
//       expiresIn: "7d",
//     });

//     // store refresh token
//     await db.query(
//       `INSERT INTO user_refresh_tokens
//       (user_id,refresh_token,expires_at)
//       VALUES (?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))`,
//       [user.id, refreshToken],
//     );

//     await db.query(
//       `UPDATE users_roles
//       SET last_login_at=NOW()
//       WHERE id=?`,
//       [user.id],
//     );

//     await db.query(
//       `INSERT INTO login_history
//       (user_id,ip_address,user_agent,status)
//       VALUES (?,?,?,?)`,
//       [user.id, req.ip, req.headers["user-agent"], "LOGIN"],
//     );

//     res.json({
//       message: "Login success",
//       accessToken,
//       refreshToken,
//       user: {
//         id: user.id,
//         username: user.username,
//         role_id: user.role_id,
//         last_login_at: user.last_login_at,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: error.message,
//     });
//   }
// };

// export const loginUser = async (req, res) => {

//   try {

//     let { login_id, password } = req.body;

//     if (!login_id || !password) {
//       return res.status(400).json({
//         message: "Login ID and password required"
//       });
//     }

//     login_id = login_id.trim().toLowerCase();

//     const [users] = await db.query(
//       `SELECT *
//        FROM users_roles
//        WHERE LOWER(username)=?
//        OR LOWER(email)=?
//        OR phone=?`,
//       [login_id, login_id, login_id]
//     );

//     if (!users.length) {
//       return res.status(401).json({
//         message: "Invalid credentials"
//       });
//     }

//     const user = users[0];

//     const valid = await bcrypt.compare(password, user.password);

//     if (!valid) {
//       return res.status(401).json({
//         message: "Invalid credentials"
//       });
//     }

//     const accessToken = jwt.sign(
//       { id: user.id, role_id: user.role_id },
//       ACCESS_SECRET,
//       { expiresIn: "15m" }
//     );

//     const refreshToken = jwt.sign(
//       { id: user.id },
//       REFRESH_SECRET,
//       { expiresIn: "7d" }
//     );

//     await db.query(
//       `INSERT INTO user_refresh_tokens
//        (user_id,refresh_token,expires_at)
//        VALUES (?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))`,
//       [user.id, refreshToken]
//     );

//     await db.query(
//       `UPDATE users_roles
//        SET last_login_at=NOW()
//        WHERE id=?`,
//       [user.id]
//     );

//     await db.query(
//       `INSERT INTO login_history
//        (user_id,ip_address,user_agent,status)
//        VALUES (?,?,?,?)`,
//       [user.id, req.ip, req.headers["user-agent"], "LOGIN"]
//     );

//     res.json({
//       message: "Login success",
//       accessToken,
//       refreshToken,
//       user: {
//         id: user.id,
//         username: user.username,
//         email: user.email,
//         phone: user.phone,
//         role_id: user.role_id,
//         last_login_at: user.last_login_at
//       }
//     });

//   } catch (error) {

//     res.status(500).json({
//       message: error.message
//     });

//   }

// };

// cookies and headers
// export const loginUser = async (req, res) => {
//   try {
//     const { login_id, password } = req.body;

//     const [users] = await db.query(
//       `SELECT * FROM users_roles
//        WHERE LOWER(username)=?
//        OR LOWER(email)=?
//        OR phone=?`,
//       [login_id, login_id, login_id]
//     );

//     if (!users.length) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const user = users[0];

//     const valid = await bcrypt.compare(password, user.password);
//     if (!valid) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const accessToken = generateAccessToken(user);
//     const refreshToken = generateRefreshToken(user);

//     await db.query(
//       `INSERT INTO user_refresh_tokens
//        (user_id, refresh_token, expires_at)
//        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
//       [user.id, refreshToken]
//     );

//     const isMobile = req.headers["x-client-type"] === "mobile";

//     // 🔥 WEB → use cookies
//     if (!isMobile) {
//       res.cookie("accessToken", accessToken, {
//         httpOnly: true,
//         secure: true,
//         sameSite: "Strict",
//         maxAge: 15 * 60 * 1000
//       });

//       res.cookie("refreshToken", refreshToken, {
//         httpOnly: true,
//         secure: true,
//         sameSite: "Strict",
//         maxAge: 7 * 24 * 60 * 60 * 1000
//       });

//       return res.json({
//         message: "Login success (web)"
//       });
//     }

//     // 🔥 MOBILE → return tokens
//     return res.json({
//       message: "Login success (mobile)",
//       accessToken,
//       refreshToken
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// single login token
// export const loginUser = async (req, res) => {
//   try {
//     let { login_id, password } = req.body;

//     // 🔒 VALIDATION
//     if (!login_id || !password) {
//       return res.status(400).json({
//         message: "Login ID and password required",
//       });
//     }

//     login_id = login_id.trim().toLowerCase();

//     const [users] = await db.query(
//       `SELECT * FROM users_roles
//        WHERE LOWER(username)=?
//        OR LOWER(email)=?
//        OR phone=?`,
//       [login_id, login_id, login_id]
//     );

//     if (!users.length) {
//       return res.status(401).json({
//         message: "Invalid credentials",
//       });
//     }

//     const user = users[0];

//     const isValid = await bcrypt.compare(password, user.password);

//     if (!isValid) {
//       return res.status(401).json({
//         message: "Invalid credentials",
//       });
//     }

//     // 🔑 TOKENS
//     const accessToken = jwt.sign(
//       { id: user.id, role_id: user.role_id },
//       ACCESS_SECRET,
//       { expiresIn: "15m" }
//     );

//     const refreshToken = jwt.sign(
//       { id: user.id },
//       REFRESH_SECRET,
//       { expiresIn: "7d" }
//     );

//     // ❗ OPTIONAL: single session (remove if multi-device allowed)
//     await db.query(
//       `UPDATE user_refresh_tokens
//        SET is_active=0
//        WHERE user_id=?`,
//       [user.id]
//     );

//     // 💾 STORE REFRESH TOKEN
//     await db.query(
//       `INSERT INTO user_refresh_tokens
//        (user_id, refresh_token, ip_address, user_agent, expires_at)
//        VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
//       [
//         user.id,
//         refreshToken,
//         req.ip,
//         req.headers["user-agent"] || "unknown",
//       ]
//     );

//     // 📜 LOGIN HISTORY
//     await db.query(
//       `INSERT INTO login_history
//        (user_id, ip_address, user_agent)
//        VALUES (?, ?, ?)`,
//       [
//         user.id,
//         req.ip,
//         req.headers["user-agent"] || "unknown",
//       ]
//     );

//     await db.query(
//       `UPDATE users_roles SET last_login_at=NOW() WHERE id=?`,
//       [user.id]
//     );

//     return res.json({
//       message: "Login success",
//       accessToken,
//       refreshToken,
//     });

//   } catch (error) {
//     console.error("LOGIN ERROR:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//     });
//   }
// };

// export const loginUser = async (req, res) => {
//   try {
//     let { login_id, password } = req.body;

//     if (!login_id || !password) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }

//     login_id = login_id.trim().toLowerCase();

//     const [users] = await db.query(
//       `SELECT * FROM users_roles
//        WHERE LOWER(username)=? OR LOWER(email)=? OR phone=?`,
//       [login_id, login_id, login_id]
//     );

//     if (!users.length) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const user = users[0];

//     const valid = await bcrypt.compare(password, user.password);
//     if (!valid) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const sessionId = uuidv4();

//     const accessToken = jwt.sign(
//       { id: user.id, role_id: user.role_id, session_id: sessionId },
//       ACCESS_SECRET,
//       { expiresIn: "15m" }
//     );

//     const refreshToken = jwt.sign(
//       { id: user.id, session_id: sessionId },
//       REFRESH_SECRET,
//       { expiresIn: "7d" }
//     );

//     await db.query(
//       `INSERT INTO user_refresh_tokens
//        (user_id, session_id, refresh_token, ip_address, user_agent, expires_at)
//        VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
//       [
//         user.id,
//         sessionId,
//         refreshToken,
//         req.ip,
//         req.headers["user-agent"] || "unknown",
//       ]
//     );

//     await db.query(
//       `INSERT INTO login_history
//        (user_id, session_id, ip_address, user_agent)
//        VALUES (?, ?, ?, ?)`,
//       [
//         user.id,
//         sessionId,
//         req.ip,
//         req.headers["user-agent"] || "unknown",
//       ]
//     );

//     return res.json({
//       message: "Login success",
//       accessToken,
//       refreshToken,
//       sessionId
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const loginUser = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     let { login_id, password } = req.body;

//     if (!login_id || !password) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }

//     login_id = login_id.trim().toLowerCase();

//     /* =========================
//        1️⃣ GET USER
//     ========================= */
//     const [users] = await connection.query(
//       `SELECT * FROM users_roles
//        WHERE LOWER(username)=? OR LOWER(email)=? OR phone=?`,
//       [login_id, login_id, login_id]
//     );

//     if (!users.length) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const user = users[0];

//     if (user.status !== "active") {
//       return res.status(403).json({
//         message: "User is inactive"
//       });
//     }

//     /* =========================
//        2️⃣ PASSWORD CHECK
//     ========================= */
//     const valid = await bcrypt.compare(password, user.password);

//     if (!valid) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     /* =========================
//        3️⃣ TOKEN GENERATION
//     ========================= */
//     const sessionId = uuidv4();

//     const accessToken = jwt.sign(
//       { id: user.id, role_id: user.role_id, session_id: sessionId },
//       process.env.JWT_ACCESS_SECRET,
//       // { expiresIn: "15m" }
//       { expiresIn: process.env.ACCESS_TOKEN_EXPIRES }
//     );

//     const refreshToken = jwt.sign(
//       { id: user.id, session_id: sessionId },
//       process.env.JWT_REFRESH_SECRET,
//       // { expiresIn: "7d" }
//       { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
//     );

//     await connection.beginTransaction();

//     /* =========================
//        4️⃣ STORE REFRESH TOKEN
//     ========================= */
//     await connection.query(
//       `INSERT INTO user_refresh_tokens
//        (user_id, session_id, refresh_token, ip_address, user_agent, expires_at)
//        VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
//       [
//         user.id,
//         sessionId,
//         refreshToken,
//         req.ip,
//         req.headers["user-agent"] || "unknown",
//       ]
//     );

//     /* =========================
//        5️⃣ LOGIN HISTORY
//     ========================= */
//     await connection.query(
//       `INSERT INTO login_history
//        (user_id, session_id, ip_address, user_agent)
//        VALUES (?, ?, ?, ?)`,
//       [
//         user.id,
//         sessionId,
//         req.ip,
//         req.headers["user-agent"] || "unknown",
//       ]
//     );

//     /* =========================
//        6️⃣ UPDATE LAST LOGIN 🔥
//     ========================= */
//     await connection.query(
//       `UPDATE users_roles
//        SET last_login_at = NOW()
//        WHERE id = ?`,
//       [user.id]
//     );

//     await connection.commit();

//     /* =========================
//        7️⃣ RESPONSE
//     ========================= */
//     return res.json({
//       message: "Login success",
//       accessToken,
//       refreshToken,
//       sessionId,
//       last_login_at: new Date() // optional
//     });

//   } catch (error) {
//     await connection.rollback();

//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });

//   } finally {
//     connection.release();
//   }
// };

// implementation Load all permissions once
// export const loginUser = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     let { login_id, password } = req.body;

//     if (!login_id || !password) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }

//     login_id = login_id.trim().toLowerCase();

//     /* =========================
//        1️⃣ GET USER
//     ========================= */
//     const [users] = await connection.query(
//       `SELECT * FROM users_roles
//        WHERE LOWER(username)=? OR LOWER(email)=? OR phone=?`,
//       [login_id, login_id, login_id],
//     );

//     if (!users.length) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const user = users[0];

//     if (user.status !== "active") {
//       return res.status(403).json({
//         message: "User is inactive",
//       });
//     }

//     /* =========================
//        2️⃣ PASSWORD CHECK
//     ========================= */
//     const valid = await bcrypt.compare(password, user.password);

//     if (!valid) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     /* =========================
//    6.5️⃣ LOAD PERMISSIONS 🔥
// ========================= */
//     const [permRows] = await connection.query(
//       `
//   SELECT
//     m.code AS module_code,
//     ma.action_code,
//     COALESCE(up.is_allowed, rp.is_allowed, FALSE) AS is_allowed
//   FROM modules m
//   JOIN module_actions ma ON ma.module_id = m.id

//   LEFT JOIN role_permissions rp
//     ON rp.module_id = m.id
//     AND rp.action_id = ma.id
//     AND rp.role_id = ?

//   LEFT JOIN user_permissions up
//     ON up.module_id = m.id
//     AND up.action_id = ma.id
//     AND up.user_id = ?
// `,
//       [user.role_id, user.id],
//     );

//     // const permissions = {};
//     // for (const row of permRows) {
//     //   const { module_code, action_code, is_allowed } = row;
//     //   if (!permissions[module_code]) permissions[module_code] = {};
//     //   permissions[module_code][action_code] = is_allowed;
//     // }

//     const permissions = {};

//     permRows.forEach((p) => {
//       const key = `${p.module_code}_${p.action_code}`;
//       permissions[key] = p.is_allowed === 1;
//     });

//     /* =========================
//        3️⃣ TOKEN GENERATION
//     ========================= */
//     const sessionId = uuidv4();

//     const accessToken = jwt.sign(
//       {
//         id: user.id,
//         role_id: user.role_id,
//         session_id: sessionId,
//         permissions,
//       },
//       process.env.JWT_ACCESS_SECRET,
//       // { expiresIn: "15m" }
//       { expiresIn: process.env.ACCESS_TOKEN_EXPIRES },
//     );

//     const refreshToken = jwt.sign(
//       { id: user.id, session_id: sessionId },
//       process.env.JWT_REFRESH_SECRET,
//       // { expiresIn: "7d" }
//       { expiresIn: process.env.REFRESH_TOKEN_EXPIRES },
//     );

//     await connection.beginTransaction();

//     /* =========================
//        4️⃣ STORE REFRESH TOKEN
//     ========================= */
//     await connection.query(
//       `INSERT INTO user_refresh_tokens
//        (user_id, session_id, refresh_token, ip_address, user_agent, expires_at)
//        VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
//       [
//         user.id,
//         sessionId,
//         refreshToken,
//         req.ip,
//         req.headers["user-agent"] || "unknown",
//       ],
//     );

//     /* =========================
//        5️⃣ LOGIN HISTORY
//     ========================= */
//     await connection.query(
//       `INSERT INTO login_history
//        (user_id, session_id, ip_address, user_agent)
//        VALUES (?, ?, ?, ?)`,
//       [user.id, sessionId, req.ip, req.headers["user-agent"] || "unknown"],
//     );

//     /* =========================
//        6️⃣ UPDATE LAST LOGIN 🔥
//     ========================= */
//     await connection.query(
//       `UPDATE users_roles
//        SET last_login_at = NOW()
//        WHERE id = ?`,
//       [user.id],
//     );

//     await connection.commit();

//     /* =========================
//        7️⃣ RESPONSE
//     ========================= */
//     return res.json({
//       message: "Login success",
//       accessToken,
//       refreshToken,
//       sessionId,
//       permissions,
//       last_login_at: new Date(), // optional
//     });
//   } catch (error) {
//     await connection.rollback();

//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   } finally {
//     connection.release();
//   }
// };

// export const loginUser = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     let { login_id, password } = req.body;

//     if (!login_id || !password) {
//       return res.status(400).json({
//         message: "Required fields missing",
//       });
//     }

//     login_id = login_id.trim().toLowerCase();

//     /* =========================
//        1️⃣ GET USER + ROLE
//     ========================= */
//     const [users] = await connection.query(
//       `
//       SELECT
//         u.*,
//         r.status AS role_status
//       FROM users_roles u
//       JOIN role_based r ON u.role_id = r.id
//       WHERE LOWER(u.username)=?
//          OR LOWER(u.email)=?
//          OR u.phone=?
//       `,
//       [login_id, login_id, login_id],
//     );

//     if (!users.length) {
//       return res.status(401).json({
//         message: "Invalid credentials",
//       });
//     }

//     const user = users[0];

//     /* =========================
//        2️⃣ USER STATUS CHECK
//     ========================= */
//     if (user.status !== "active") {
//       return res.status(403).json({
//         message: "User is inactive",
//       });
//     }

//     /* =========================
//        3️⃣ ROLE STATUS CHECK 🔥
//     ========================= */
//     if (user.role_status !== "active") {
//       return res.status(403).json({
//         message: "Your role is inactive. Contact admin.",
//       });
//     }

//     /* =========================
//        4️⃣ PASSWORD CHECK
//     ========================= */
//     const valid = await bcrypt.compare(password, user.password);

//     if (!valid) {
//       return res.status(401).json({
//         message: "Invalid credentials",
//       });
//     }

//     /* =========================
//        5️⃣ LOAD PERMISSIONS
//     ========================= */
//     const [permRows] = await connection.query(
//       `
//       SELECT
//         m.code AS module_code,
//         ma.action_code,
//         COALESCE(up.is_allowed, rp.is_allowed, FALSE) AS is_allowed
//       FROM modules m
//       JOIN module_actions ma ON ma.module_id = m.id

//       LEFT JOIN role_permissions rp
//         ON rp.module_id = m.id
//         AND rp.action_id = ma.id
//         AND rp.role_id = ?

//       LEFT JOIN user_permissions up
//         ON up.module_id = m.id
//         AND up.action_id = ma.id
//         AND up.user_id = ?
//       `,
//       [user.role_id, user.id],
//     );

//     const permissions = {};
//     permRows.forEach((p) => {
//       const key = `${p.module_code}_${p.action_code}`;
//       permissions[key] = p.is_allowed === 1;
//     });

//     /* =========================
//        6️⃣ TOKEN GENERATION
//     ========================= */
//     const sessionId = uuidv4();

//     // const accessToken = jwt.sign(
//     //   {
//     //     id: user.id,
//     //     role_id: user.role_id,
//     //     session_id: sessionId,
//     //     permissions,
//     //   },
//     //   process.env.JWT_ACCESS_SECRET,
//     //   { expiresIn: process.env.ACCESS_TOKEN_EXPIRES }
//     // );

//     const accessToken = jwt.sign(
//       {
//         id: user.id,
//         role_id: user.role_id,
//         session_id: sessionId,
//         token_version: user.token_version, // 🔥 ADD THIS
//         permissions,
//       },
//       process.env.JWT_ACCESS_SECRET,
//       { expiresIn: process.env.ACCESS_TOKEN_EXPIRES },
//     );

//     const refreshToken = jwt.sign(
//       {
//         id: user.id,
//         session_id: sessionId,
//       },
//       process.env.JWT_REFRESH_SECRET,
//       { expiresIn: process.env.REFRESH_TOKEN_EXPIRES },
//     );

//     await connection.beginTransaction();

//     /* =========================
//        7️⃣ STORE REFRESH TOKEN
//     ========================= */
//     await connection.query(
//       `
//       INSERT INTO user_refresh_tokens
//       (user_id, session_id, refresh_token, ip_address, user_agent, expires_at)
//       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))
//       `,
//       [
//         user.id,
//         sessionId,
//         refreshToken,
//         req.ip,
//         req.headers["user-agent"] || "unknown",
//       ],
//     );

//     /* =========================
//        8️⃣ LOGIN HISTORY
//     ========================= */
//     await connection.query(
//       `
//       INSERT INTO login_history
//       (user_id, session_id, ip_address, user_agent)
//       VALUES (?, ?, ?, ?)
//       `,
//       [user.id, sessionId, req.ip, req.headers["user-agent"] || "unknown"],
//     );

//     /* =========================
//        9️⃣ UPDATE LAST LOGIN
//     ========================= */
//     await connection.query(
//       `
//       UPDATE users_roles
//       SET last_login_at = NOW()
//       WHERE id = ?
//       `,
//       [user.id],
//     );

//     await connection.commit();

//     /* =========================
//        🔟 RESPONSE
//     ========================= */
//     return res.json({
//       message: "Login success",
//       accessToken,
//       refreshToken,
//       sessionId,
//       permissions,
//       last_login_at: new Date(),
//     });
//   } catch (error) {
//     await connection.rollback();
//     console.error(error);

//     res.status(500).json({
//       message: "Internal server error",
//     });
//   } finally {
//     connection.release();
//   }
// };

export const loginUser = async (req, res) => {
  const connection = await db.getConnection();

  try {
    let { login_id, password } = req.body;

    if (!login_id || !password) {
      return res.status(400).json({
        message: "Required fields missing",
      });
    }

    login_id = login_id.trim().toLowerCase();

    /* =========================
       1️⃣ GET USER + ROLE
    ========================= */
    const [users] = await connection.query(
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

    if (!users.length) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const user = users[0];

    /* =========================
       2️⃣ USER STATUS CHECK
    ========================= */
    if (user.status !== "active") {
      return res.status(403).json({
        message: "User is inactive",
      });
    }

    /* =========================
       3️⃣ ROLE STATUS CHECK 🔥
    ========================= */
    if (user.role_status !== "active") {
      return res.status(403).json({
        message: "Your role is inactive. Contact admin.",
      });
    }

    /* =========================
       4️⃣ PASSWORD CHECK
    ========================= */
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    /* =========================
       5️⃣ LOAD PERMISSIONS
    ========================= */
    const [permRows] = await connection.query(
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
      const key = `${p.module_code}_${p.action_code}`;
      permissions[key] = p.is_allowed === 1;
    });

    /* =========================
       6️⃣ TOKEN GENERATION
    ========================= */
    const sessionId = uuidv4();

    const accessToken = jwt.sign(
      {
        id: user.id,
        role_id: user.role_id,
        role: user.role_name,
        session_id: sessionId,
        token_version: user.token_version, // 🔥 critical
        permissions,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRES },
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        session_id: sessionId,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES },
    );

    await connection.beginTransaction();

    /* =========================
       7️⃣ STORE REFRESH TOKEN
    ========================= */
    await connection.query(
      `
      INSERT INTO user_refresh_tokens
      (user_id, session_id, refresh_token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))
      `,
      [
        user.id,
        sessionId,
        refreshToken,
        req.ip,
        req.headers["user-agent"] || "unknown",
      ],
    );

    /* =========================
       8️⃣ LOGIN HISTORY
    ========================= */
    await connection.query(
      `
      INSERT INTO login_history
      (user_id, session_id, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
      `,
      [user.id, sessionId, req.ip, req.headers["user-agent"] || "unknown"],
    );

    /* =========================
       9️⃣ UPDATE LAST LOGIN
    ========================= */
    await connection.query(
      `
      UPDATE users_roles 
      SET last_login_at = NOW() 
      WHERE id = ?
      `,
      [user.id],
    );

    await connection.commit();

    /* =========================
       🔟 CLEAN RESPONSE
    ========================= */
    return res.json({
      message: "Login success",

      accessToken,
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
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};
