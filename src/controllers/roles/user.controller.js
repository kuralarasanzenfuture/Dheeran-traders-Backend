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

export const loginUser = async (req, res) => {

  try {

    let { login_id, password } = req.body;

    if (!login_id || !password) {
      return res.status(400).json({
        message: "Login ID and password required"
      });
    }

    login_id = login_id.trim().toLowerCase();

    const [users] = await db.query(
      `SELECT *
       FROM users_roles
       WHERE LOWER(username)=?
       OR LOWER(email)=?
       OR phone=?`,
      [login_id, login_id, login_id]
    );

    if (!users.length) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const user = users[0];

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, role_id: user.role_id },
      ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    await db.query(
      `INSERT INTO user_refresh_tokens
       (user_id,refresh_token,expires_at)
       VALUES (?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))`,
      [user.id, refreshToken]
    );

    await db.query(
      `UPDATE users_roles
       SET last_login_at=NOW()
       WHERE id=?`,
      [user.id]
    );

    await db.query(
      `INSERT INTO login_history
       (user_id,ip_address,user_agent,status)
       VALUES (?,?,?,?)`,
      [user.id, req.ip, req.headers["user-agent"], "LOGIN"]
    );

    res.json({
      message: "Login success",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        last_login_at: user.last_login_at
      }
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

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

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token required",
      });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    const [rows] = await db.query(
      `SELECT * FROM user_refresh_tokens
       WHERE refresh_token=? AND revoked=0`,
      [refreshToken],
    );

    if (!rows.length) {
      return res.status(403).json({
        message: "Refresh token revoked",
      });
    }

    const accessToken = jwt.sign({ id: decoded.id }, ACCESS_SECRET, {
      expiresIn: "15m",
    });

    res.json({
      accessToken,
    });
  } catch (error) {
    res.status(403).json({
      message: "Invalid refresh token",
    });
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

export const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        message: "Refresh token required",
      });
    }

    await db.query(
      `UPDATE user_refresh_tokens
       SET revoked=1
       WHERE refresh_token=?`,
      [refreshToken],
    );

    res.json({
      message: "Logout success",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
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

export const logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      `UPDATE user_refresh_tokens
       SET revoked=1
       WHERE user_id=?`,
      [userId],
    );

    res.json({
      message: "All devices logged out",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
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