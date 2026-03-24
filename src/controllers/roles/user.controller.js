// import db from "../../config/db.js";
// import bcrypt from "bcryptjs";

// // CREATE USER (ADMIN ONLY)
// export const createUser = async (req, res) => {
//   try {

//     const { username, email, phone, password, role_id } = req.body;

//     if (!username || !password || !role_id) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }

//     const usernameLower = username.toLowerCase();

//     // check role
//     const [role] = await db.query(
//       `SELECT role_name FROM role_based WHERE id=?`,
//       [role_id]
//     );

//     if (!role.length) {
//       return res.status(400).json({ message: "Invalid role" });
//     }

//     // block multiple admin users
//     if (role[0].role_name === "ADMIN") {

//       const [admin] = await db.query(
//         `SELECT id FROM users_roles WHERE role_id=?`,
//         [role_id]
//       );

//       if (admin.length > 0) {
//         return res.status(400).json({
//           message: "Only one ADMIN allowed"
//         });
//       }
//     }

//     const hash = await bcrypt.hash(password, 10);

//     await db.query(
//       `INSERT INTO users_roles
//       (username,email,phone,password,role_id)
//       VALUES (?,?,?,?,?)`,
//       [usernameLower, email, phone, hash, role_id]
//     );

//     res.json({ message: "User created successfully" });

//   } catch (error) {

//     res.status(500).json({ message: error.message });

//   }
// };

// export const loginUser = async (req, res) => {

//   try {

//     const { username, password } = req.body;

//     const usernameLower = username.toLowerCase();

//     const [user] = await db.query(`
//       SELECT * FROM users_roles
//       WHERE username=?
//     `,[usernameLower]);

//     if(!user.length){
//       return res.status(401).json({
//         message:"Invalid credentials"
//       });
//     }

//     const valid = await bcrypt.compare(
//       password,
//       user[0].password
//     );

//     if(!valid){
//       return res.status(401).json({
//         message:"Invalid credentials"
//       });
//     }

//     // update last login
//     await db.query(`
//       UPDATE users_roles
//       SET last_login_at=NOW()
//       WHERE id=?
//     `,[user[0].id]);

//     // login history
//     await db.query(`
//       INSERT INTO login_history
//       (user_id,ip_address,user_agent,status)
//       VALUES (?,?,?,?)
//     `,[
//       user[0].id,
//       req.ip,
//       req.headers["user-agent"],
//       "LOGIN"
//     ]);

//     res.json({
//       message:"Login success",
//       user_id:user[0].id
//     });

//   } catch(error){
//     res.status(500).json({message:error.message});
//   }

// };

// export const deleteUser = async (req, res) => {

//   try {

//     const { id } = req.params;

//     const [user] = await db.query(`
//       SELECT u.id,r.role_name
//       FROM users_roles u
//       JOIN role_based r ON u.role_id=r.id
//       WHERE u.id=?
//     `,[id]);

//     if(!user.length){
//       return res.status(404).json({message:"User not found"});
//     }

//     if(user[0].role_name === "ADMIN"){
//       return res.status(403).json({
//         message:"ADMIN user cannot be deleted"
//       });
//     }

//     await db.query(`DELETE FROM users_roles WHERE id=?`,[id]);

//     res.json({message:"User deleted successfully"});

//   } catch(error){
//     res.status(500).json({message:error.message});
//   }

// };

// export const logoutUser = async (req,res)=>{

//   try{

//     const {user_id} = req.body;

//     await db.query(`
//       INSERT INTO login_history
//       (user_id,ip_address,user_agent,status,logout_time)
//       VALUES (?,?,?,?,NOW())
//     `,[
//       user_id,
//       req.ip,
//       req.headers["user-agent"],
//       "LOGOUT"
//     ]);

//     res.json({message:"Logout success"});

//   }catch(error){
//     res.status(500).json({message:error.message});
//   }

// };

// user roles
// login history
// JWT auth
// refresh token
// admin protection

import db from "../../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/* ------------------------------------------------
CREATE USER
------------------------------------------------ */

// export const createUser = async (req, res) => {
//   try {
//     let { username, email, phone, password, role_id } = req.body;

//     if (!username || !password || !role_id) {
//       return res.status(400).json({
//         message: "Username, password and role required",
//       });
//     }

//     username = username.toLowerCase();

//     // check role exists
//     const [role] = await db.query(
//       `SELECT role_name FROM role_based WHERE id=?`,
//       [role_id],
//     );

//     if (!role.length) {
//       return res.status(400).json({
//         message: "Invalid role",
//       });
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

//     // check duplicate username/email/phone
//     // const [exists] = await db.query(
//     //   `SELECT id FROM users_roles
//     //    WHERE username=? OR email=? OR phone=?`,
//     //   [username, email, phone],
//     // );

//     // if (exists.length) {
//     //   return res.status(400).json({
//     //     message: "Username/email/phone already exists",
//     //   });
//     // }

//     // // check username
//     // const [usernameExists] = await db.query(
//     //   `SELECT id FROM users_roles WHERE username=?`,
//     //   [username],
//     // );

//     // if (usernameExists.length) {
//     //   return res.status(400).json({
//     //     message: "Username already exists",
//     //   });
//     // }

//     // // check email
//     // if (email) {
//     //   const [emailExists] = await db.query(
//     //     `SELECT id FROM users_roles WHERE email=?`,
//     //     [email],
//     //   );

//     //   if (emailExists.length) {
//     //     return res.status(400).json({
//     //       message: "Email already exists",
//     //     });
//     //   }
//     // }

//     // // check phone
//     // if (phone) {
//     //   const [phoneExists] = await db.query(
//     //     `SELECT id FROM users_roles WHERE phone=?`,
//     //     [phone],
//     //   );

//     //   if (phoneExists.length) {
//     //     return res.status(400).json({
//     //       message: "Phone number already exists",
//     //     });
//     //   }
//     // }

//     // proffessional validation

//     const errors = {};

//     // username check
//     const [usernameExists] = await db.query(
//       `SELECT id FROM users_roles WHERE username=?`,
//       [username],
//     );

//     if (usernameExists.length) {
//       errors.username = "Username already exists";
//     }

//     // email check
//     if (email) {
//       const [emailExists] = await db.query(
//         `SELECT id FROM users_roles WHERE email=?`,
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
//       return res.status(400).json({
//         errors,
//       });
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
//     res.status(500).json({ message: error.message });
//   }
// };

export const createUser = async (req, res) => {
  try {
    let { username, email, phone, password, role_id } = req.body;

    if (!username || !password || !role_id) {
      return res.status(400).json({
        message: "Username, password and role required"
      });
    }

    username = username.trim().toLowerCase();
    email = email ? email.trim().toLowerCase() : null;

    // check role
    const [role] = await db.query(
      `SELECT role_name FROM role_based WHERE id=?`,
      [role_id]
    );

    if (!role.length) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // only one admin allowed
    if (role[0].role_name === "ADMIN") {

      const [admin] = await db.query(
        `SELECT id FROM users_roles WHERE role_id=?`,
        [role_id]
      );

      if (admin.length > 0) {
        return res.status(400).json({
          message: "Only one ADMIN allowed"
        });
      }

    }

    const errors = {};

    // username check
    const [usernameExists] = await db.query(
      `SELECT id FROM users_roles WHERE LOWER(username)=?`,
      [username]
    );

    if (usernameExists.length) {
      errors.username = "Username already exists";
    }

    // email check
    if (email) {
      const [emailExists] = await db.query(
        `SELECT id FROM users_roles WHERE LOWER(email)=?`,
        [email]
      );

      if (emailExists.length) {
        errors.email = "Email already exists";
      }
    }

    // phone check
    if (phone) {
      const [phoneExists] = await db.query(
        `SELECT id FROM users_roles WHERE phone=?`,
        [phone]
      );

      if (phoneExists.length) {
        errors.phone = "Phone already exists";
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const hash = await bcrypt.hash(password, 10);

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
      role: role[0].role_name
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};

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

export const loginUser = async (req, res) => {
  const connection = await db.getConnection();

  try {
    let { login_id, password } = req.body;

    if (!login_id || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    login_id = login_id.trim().toLowerCase();

    /* =========================
       1️⃣ GET USER
    ========================= */
    const [users] = await connection.query(
      `SELECT * FROM users_roles
       WHERE LOWER(username)=? OR LOWER(email)=? OR phone=?`,
      [login_id, login_id, login_id]
    );

    if (!users.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    if (user.status !== "active") {
      return res.status(403).json({
        message: "User is inactive"
      });
    }

    /* =========================
       2️⃣ PASSWORD CHECK
    ========================= */
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    /* =========================
       3️⃣ TOKEN GENERATION
    ========================= */
    const sessionId = uuidv4();

    const accessToken = jwt.sign(
      { id: user.id, role_id: user.role_id, session_id: sessionId },
      process.env.JWT_ACCESS_SECRET,
      // { expiresIn: "15m" }
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRES }
    );

    const refreshToken = jwt.sign(
      { id: user.id, session_id: sessionId },
      process.env.JWT_REFRESH_SECRET,
      // { expiresIn: "7d" }
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
    );

    await connection.beginTransaction();

    /* =========================
       4️⃣ STORE REFRESH TOKEN
    ========================= */
    await connection.query(
      `INSERT INTO user_refresh_tokens
       (user_id, session_id, refresh_token, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [
        user.id,
        sessionId,
        refreshToken,
        req.ip,
        req.headers["user-agent"] || "unknown",
      ]
    );

    /* =========================
       5️⃣ LOGIN HISTORY
    ========================= */
    await connection.query(
      `INSERT INTO login_history
       (user_id, session_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?)`,
      [
        user.id,
        sessionId,
        req.ip,
        req.headers["user-agent"] || "unknown",
      ]
    );

    /* =========================
       6️⃣ UPDATE LAST LOGIN 🔥
    ========================= */
    await connection.query(
      `UPDATE users_roles 
       SET last_login_at = NOW() 
       WHERE id = ?`,
      [user.id]
    );

    await connection.commit();

    /* =========================
       7️⃣ RESPONSE
    ========================= */
    return res.json({
      message: "Login success",
      accessToken,
      refreshToken,
      sessionId,
      last_login_at: new Date() // optional
    });

  } catch (error) {
    await connection.rollback();

    console.error(error);
    res.status(500).json({ message: "Internal server error" });

  } finally {
    connection.release();
  }
};

/* ------------------------------------------------
REFRESH TOKEN
------------------------------------------------ */

// export const refreshToken = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(401).json({
//         message: "Refresh token required",
//       });
//     }

//     const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

//     const [users] = await db.query(`SELECT * FROM users_roles WHERE id=?`, [
//       decoded.id,
//     ]);

//     if (!users.length) {
//       return res.status(401).json({
//         message: "User not found",
//       });
//     }

//     const newAccessToken = jwt.sign(
//       {
//         id: users[0].id,
//         role_id: users[0].role_id,
//       },
//       ACCESS_SECRET,
//       { expiresIn: "15m" },
//     );

//     res.json({
//       accessToken: newAccessToken,
//     });
//   } catch (error) {
//     res.status(403).json({
//       message: "Invalid refresh token",
//     });
//   }
// };

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

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Token required" });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    const [rows] = await db.query(
      `SELECT * FROM user_refresh_tokens 
       WHERE refresh_token=? AND is_active=1`,
      [refreshToken]
    );

    if (!rows.length) {
      return res.status(403).json({ message: "Invalid token" });
    }

    const tokenData = rows[0];

    // 🚨 IMPORTANT: session match
    if (tokenData.session_id !== decoded.session_id) {
      return res.status(403).json({ message: "Session mismatch" });
    }

    const newRefreshToken = jwt.sign(
      { id: decoded.id, session_id: decoded.session_id },
      REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const newAccessToken = jwt.sign(
      { id: decoded.id, session_id: decoded.session_id },
      ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    // rotate ONLY this session
    await db.query(
      `UPDATE user_refresh_tokens 
       SET is_active=0 
       WHERE refresh_token=?`,
      [refreshToken]
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
        req.headers["user-agent"],
      ]
    );

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
};

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

export const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Token required" });
    }

    const [rows] = await db.query(
      `SELECT * FROM user_refresh_tokens WHERE refresh_token=?`,
      [refreshToken]
    );

    if (!rows.length) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const sessionId = rows[0].session_id;
    const userId = rows[0].user_id;

    // ❌ deactivate ONLY this session
    await db.query(
      `UPDATE user_refresh_tokens 
       SET is_active=0 
       WHERE session_id=?`,
      [sessionId]
    );

    // 📜 update logout
    await db.query(
      `UPDATE login_history
       SET logout_time=NOW()
       WHERE session_id=? AND logout_time IS NULL`,
      [sessionId]
    );

    res.json({ message: "Logged out from this device" });

  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ------------------------------------------------
DELETE USER
------------------------------------------------ */

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      `SELECT u.id,r.role_name
       FROM users_roles u
       JOIN role_based r
       ON u.role_id=r.id
       WHERE u.id=?`,
      [id],
    );

    if (!users.length) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (users[0].role_name === "ADMIN") {
      return res.status(403).json({
        message: "ADMIN cannot be deleted",
      });
    }

    await db.query(`DELETE FROM users_roles WHERE id=?`, [id]);

    res.json({
      message: "User deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
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

export const logoutAllDevices = async (req, res) => {
  const userId = req.user.id;

  await db.query(
    `UPDATE user_refresh_tokens 
     SET is_active=0 
     WHERE user_id=?`,
    [userId]
  );

  await db.query(
    `UPDATE login_history
     SET logout_time=NOW()
     WHERE user_id=? AND logout_time IS NULL`,
    [userId]
  );

  res.json({ message: "Logged out from all devices" });
};

export const checkUsername = async (req, res) => {
  try {
    let { username } = req.params;

    if (!username) {
      return res.status(400).json({
        message: "Username required",
      });
    }

    username = username.trim().toLowerCase();

    const [rows] = await db.query(
      `SELECT id FROM users_roles WHERE LOWER(username)=LOWER(?)`,
      [username],
    );

    if (rows.length > 0) {
      return res.json({
        available: false,
        message: "Username already taken",
      });
    }

    res.json({
      available: true,
      message: "Username available",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const checkEmail = async (req, res) => {
  try {
    let { email } = req.params;

    if (!email) {
      return res.status(400).json({
        message: "Email required",
      });
    }

    email = email.trim().toLowerCase();

    const [rows] = await db.query(
      `SELECT id FROM users_roles WHERE LOWER(email)=LOWER(?)`,
      [email],
    );

    if (rows.length > 0) {
      return res.json({
        available: false,
        message: "Email already registered",
      });
    }

    res.json({
      available: true,
      message: "Email available",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const checkPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({
        message: "Phone required",
      });
    }

    const [rows] = await db.query(
      `SELECT id FROM users_roles WHERE phone=?`,
      [phone],
    );

    if (rows.length > 0) {
      return res.json({
        available: false,
        message: "Phone already registered",
      });
    }

    res.json({
      available: true,
      message: "Phone available",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};



// export const updateUser = async (req, res) => {
//   try {
//     const userId = req.params.id;

//     let { username, email, phone, password, role_id, status } = req.body;

//     if (!username) {
//       return res.status(400).json({
//         message: "Username required"
//       });
//     }

//     username = username.trim().toLowerCase();
//     email = email ? email.trim().toLowerCase() : null;

//     /* =========================
//        1️⃣ CHECK USER EXISTS
//     ========================= */

//     const [existingUserArr] = await db.query(
//       `SELECT * FROM users_roles WHERE id=?`,
//       [userId]
//     );

//     if (!existingUserArr.length) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const existingUser = existingUserArr[0];

//     /* =========================
//        2️⃣ CHECK CURRENT ROLE
//     ========================= */

//     const [currentRole] = await db.query(
//       `SELECT role_name FROM role_based WHERE id=?`,
//       [existingUser.role_id]
//     );

//     const isAdminUser = currentRole[0]?.role_name === "ADMIN";

//     /* =========================
//        3️⃣ IF ADMIN → RESTRICT
//     ========================= */

//     if (isAdminUser) {
//       // block role change
//       role_id = existingUser.role_id;

//       // block status change
//       status = existingUser.status;
//     } else {
//       /* =========================
//          4️⃣ VALIDATE ROLE CHANGE
//       ========================= */

//       if (role_id) {
//         const [role] = await db.query(
//           `SELECT role_name FROM role_based WHERE id=?`,
//           [role_id]
//         );

//         if (!role.length) {
//           return res.status(400).json({ message: "Invalid role" });
//         }

//         // only one admin allowed
//         if (role[0].role_name === "ADMIN") {
//           const [admin] = await db.query(
//             `SELECT id FROM users_roles 
//              WHERE role_id=? AND id != ?`,
//             [role_id, userId]
//           );

//           if (admin.length > 0) {
//             return res.status(400).json({
//               message: "Only one ADMIN allowed"
//             });
//           }
//         }
//       } else {
//         role_id = existingUser.role_id;
//       }

//       status = status || existingUser.status;
//     }

//     /* =========================
//        5️⃣ UNIQUE VALIDATION
//     ========================= */

//     const errors = {};

//     const [usernameExists] = await db.query(
//       `SELECT id FROM users_roles 
//        WHERE LOWER(username)=? AND id != ?`,
//       [username, userId]
//     );

//     if (usernameExists.length) {
//       errors.username = "Username already exists";
//     }

//     if (email) {
//       const [emailExists] = await db.query(
//         `SELECT id FROM users_roles 
//          WHERE LOWER(email)=? AND id != ?`,
//         [email, userId]
//       );

//       if (emailExists.length) {
//         errors.email = "Email already exists";
//       }
//     }

//     if (phone) {
//       const [phoneExists] = await db.query(
//         `SELECT id FROM users_roles 
//          WHERE phone=? AND id != ?`,
//         [phone, userId]
//       );

//       if (phoneExists.length) {
//         errors.phone = "Phone already exists";
//       }
//     }

//     if (Object.keys(errors).length > 0) {
//       return res.status(400).json({ errors });
//     }

//     /* =========================
//        6️⃣ PASSWORD HASH
//     ========================= */

//     let hashedPassword = existingUser.password;

//     if (password) {
//       hashedPassword = await bcrypt.hash(password, 10);
//     }

//     /* =========================
//        7️⃣ UPDATE
//     ========================= */

//     await db.query(
//       `UPDATE users_roles 
//        SET username=?, email=?, phone=?, password=?, role_id=?, status=? 
//        WHERE id=?`,
//       [
//         username,
//         email,
//         phone,
//         hashedPassword,
//         role_id,
//         status,
//         userId
//       ]
//     );

//     res.json({
//       message: "User updated successfully"
//     });

//   } catch (error) {
//     res.status(500).json({
//       message: error.message
//     });
//   }
// };

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
        message: "Only admin can update users"
      });
    }

    /* =========================
       1️⃣ VALIDATION
    ========================= */
    if (!username) {
      return res.status(400).json({
        message: "Username required"
      });
    }

    username = username.trim().toLowerCase();
    email = email ? email.trim().toLowerCase() : null;

    if (phone && !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Invalid phone number"
      });
    }

    if (status !== undefined && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }

    /* =========================
       2️⃣ GET USER
    ========================= */
    const [userArr] = await connection.query(
      `SELECT * FROM users_roles WHERE id=? FOR UPDATE`,
      [userId]
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
      `SELECT id FROM role_based WHERE UPPER(role_name)='ADMIN' LIMIT 1`
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
      [role_id]
    );

    if (!role.length) {
      await connection.rollback();
      return res.status(400).json({
        message: "Invalid role"
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
          message: "Cannot change ADMIN role"
        });
      }

      // cannot deactivate
      if (status === "inactive") {
        await connection.rollback();
        return res.status(400).json({
          message: "Cannot deactivate ADMIN"
        });
      }
    }

    // prevent creating second admin
    if (newRoleName === "ADMIN" && role_id !== existingUser.role_id) {
      const [adminCheck] = await connection.query(
        `SELECT COUNT(*) as count FROM users_roles WHERE role_id=?`,
        [adminRoleId]
      );

      if (adminCheck[0].count > 0) {
        await connection.rollback();
        return res.status(400).json({
          message: "Only one ADMIN allowed"
        });
      }
    }

    /* =========================
       6️⃣ UNIQUE VALIDATION
    ========================= */
    const errors = {};

    const [u1] = await connection.query(
      `SELECT id FROM users_roles WHERE LOWER(username)=? AND id != ?`,
      [username, userId]
    );
    if (u1.length) errors.username = "Username already exists";

    if (email) {
      const [u2] = await connection.query(
        `SELECT id FROM users_roles WHERE LOWER(email)=? AND id != ?`,
        [email, userId]
      );
      if (u2.length) errors.email = "Email already exists";
    }

    if (phone) {
      const [u3] = await connection.query(
        `SELECT id FROM users_roles WHERE phone=? AND id != ?`,
        [phone, userId]
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
      [
        username,
        email,
        phone,
        hashedPassword,
        role_id,
        status,
        userId
      ]
    );

    await connection.commit();

    res.json({
      message: "User updated successfully"
    });

  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      message: error.message
    });
  } finally {
    connection.release();
  }
};

export const updateUserStrict = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.params.id;

    let { username, email, phone, password, role_id, status } = req.body;

    /* =========================
       AUTH
    ========================= */
    if (!req.user || req.user.role_id !== 1) {
      return res.status(403).json({ message: "Only admin allowed" });
    }

    /* =========================
       REQUIRED FIELDS
    ========================= */
    if (!username || !password || !role_id || !status) {
      return res.status(400).json({
        message: "username, password, role_id, status required"
      });
    }

    username = username.trim().toLowerCase();
    email = email ? email.trim().toLowerCase() : null;

    if (phone && !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ message: "Invalid phone" });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    /* =========================
       GET USER
    ========================= */
    const [userArr] = await connection.query(
      `SELECT * FROM users_roles WHERE id=? FOR UPDATE`,
      [userId]
    );

    if (!userArr.length) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const existingUser = userArr[0];

    /* =========================
       ROLE VALIDATION
    ========================= */
    const [role] = await connection.query(
      `SELECT role_name FROM role_based WHERE id=?`,
      [role_id]
    );

    if (!role.length) {
      await connection.rollback();
      return res.status(400).json({ message: "Invalid role" });
    }

    /* =========================
       ADMIN PROTECTION
    ========================= */
    const isAdmin =
      role[0].role_name.toUpperCase() === "ADMIN";

    if (isAdmin) {
      const [admin] = await connection.query(
        `SELECT id FROM users_roles WHERE role_id=? AND id != ?`,
        [role_id, userId]
      );

      if (admin.length) {
        await connection.rollback();
        return res.status(400).json({
          message: "Only one ADMIN allowed"
        });
      }

      if (status === "inactive") {
        await connection.rollback();
        return res.status(400).json({
          message: "Cannot deactivate ADMIN"
        });
      }
    }

    /* =========================
       UNIQUE CHECK
    ========================= */
    const errors = {};

    const [u1] = await connection.query(
      `SELECT id FROM users_roles WHERE LOWER(username)=? AND id != ?`,
      [username, userId]
    );
    if (u1.length) errors.username = "Username exists";

    if (email) {
      const [u2] = await connection.query(
        `SELECT id FROM users_roles WHERE LOWER(email)=? AND id != ?`,
        [email, userId]
      );
      if (u2.length) errors.email = "Email exists";
    }

    if (phone) {
      const [u3] = await connection.query(
        `SELECT id FROM users_roles WHERE phone=? AND id != ?`,
        [phone, userId]
      );
      if (u3.length) errors.phone = "Phone exists";
    }

    if (Object.keys(errors).length) {
      await connection.rollback();
      return res.status(400).json({ errors });
    }

    /* =========================
       UPDATE
    ========================= */
    const hash = await bcrypt.hash(password, 10);

    await connection.query(
      `UPDATE users_roles 
       SET username=?, email=?, phone=?, password=?, role_id=?, status=? 
       WHERE id=?`,
      [username, email, phone, hash, role_id, status, userId]
    );

    await connection.commit();

    res.json({ message: "User updated (STRICT)" });

  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

export const updateUserPatch = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.params.id;

    let { username, email, phone, password, role_id, status } = req.body;

    if (!req.user || req.user.role_id !== 1) {
      return res.status(403).json({ message: "Only admin allowed" });
    }

    /* =========================
       AT LEAST ONE FIELD
    ========================= */
    if (
      !username &&
      !email &&
      !phone &&
      !password &&
      role_id === undefined &&
      status === undefined
    ) {
      return res.status(400).json({
        message: "At least one field required"
      });
    }

    const [userArr] = await connection.query(
      `SELECT * FROM users_roles WHERE id=? FOR UPDATE`,
      [userId]
    );

    if (!userArr.length) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const existingUser = userArr[0];

    /* =========================
       NORMALIZE INPUT
    ========================= */
    username = username
      ? username.trim().toLowerCase()
      : existingUser.username;

    email = email !== undefined
      ? (email ? email.trim().toLowerCase() : null)
      : existingUser.email;

    phone = phone !== undefined ? phone : existingUser.phone;

    if (phone && !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ message: "Invalid phone" });
    }

    /* =========================
       ROLE + STATUS
    ========================= */
    role_id =
      role_id !== undefined ? role_id : existingUser.role_id;

    status =
      status !== undefined ? status : existingUser.status;

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    /* =========================
       ADMIN PROTECTION
    ========================= */
    const [role] = await connection.query(
      `SELECT role_name FROM role_based WHERE id=?`,
      [role_id]
    );

    if (!role.length) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const isAdmin =
      role[0].role_name.toUpperCase() === "ADMIN";

    if (isAdmin) {
      const [admin] = await connection.query(
        `SELECT id FROM users_roles WHERE role_id=? AND id != ?`,
        [role_id, userId]
      );

      if (admin.length) {
        return res.status(400).json({
          message: "Only one ADMIN allowed"
        });
      }

      if (status === "inactive") {
        return res.status(400).json({
          message: "Cannot deactivate ADMIN"
        });
      }
    }

    /* =========================
       UNIQUE CHECK
    ========================= */
    const errors = {};

    const [u1] = await connection.query(
      `SELECT id FROM users_roles WHERE LOWER(username)=? AND id != ?`,
      [username, userId]
    );
    if (u1.length) errors.username = "Username exists";

    if (email) {
      const [u2] = await connection.query(
        `SELECT id FROM users_roles WHERE LOWER(email)=? AND id != ?`,
        [email, userId]
      );
      if (u2.length) errors.email = "Email exists";
    }

    if (phone) {
      const [u3] = await connection.query(
        `SELECT id FROM users_roles WHERE phone=? AND id != ?`,
        [phone, userId]
      );
      if (u3.length) errors.phone = "Phone exists";
    }

    if (Object.keys(errors).length) {
      return res.status(400).json({ errors });
    }

    /* =========================
       PASSWORD
    ========================= */
    let hash = existingUser.password;

    if (password) {
      hash = await bcrypt.hash(password, 10);
    }

    /* =========================
       UPDATE
    ========================= */
    await connection.query(
      `UPDATE users_roles 
       SET username=?, email=?, phone=?, password=?, role_id=?, status=? 
       WHERE id=?`,
      [username, email, phone, hash, role_id, status, userId]
    );

    await connection.commit();

    res.json({ message: "User updated (PATCH)" });

  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

