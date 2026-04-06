import db from "../../config/db.js";

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

    const [rows] = await db.query(`SELECT id FROM users_roles WHERE phone=?`, [
      phone,
    ]);

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

// export const getAllUsers = async (req, res) => {
//   try {
//     let {
//       page = 1,
//       limit = 10,
//       search = "",
//       status,
//       role_id
//     } = req.query;

//     page = parseInt(page);
//     limit = parseInt(limit);
//     const offset = (page - 1) * limit;

//     let query = `
//       SELECT id, username, email, phone, role_id, status, created_at
//       FROM users_roles
//       WHERE 1=1
//     `;

//     const params = [];

//     if (search) {
//       query += ` AND (
//         username LIKE ? OR email LIKE ? OR phone LIKE ?
//       )`;
//       params.push(`%${search}%`, `%${search}%`, `%${search}%`);
//     }

//     if (status) {
//       query += ` AND status = ?`;
//       params.push(status);
//     }

//     if (role_id) {
//       query += ` AND role_id = ?`;
//       params.push(role_id);
//     }

//     query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
//     params.push(limit, offset);

//     const [users] = await db.query(query, params);

//     res.json({
//       page,
//       limit,
//       data: users
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const getAllUsers = async (req, res) => {
//   try {
//     const [users] = await db.query(`
//       SELECT
//         id,
//         username,
//         email,
//         phone,
//         role_id,
//         status,
//         created_at
//       FROM users_roles
//       ORDER BY id DESC
//     `);

//     res.json(users);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: "Internal server error"
//     });
//   }
// };

export const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.phone,
        u.role_id,
        r.role_name AS role_name,
        u.status,
        u.created_at
      FROM users_roles u
      JOIN role_based r ON u.role_id = r.id
      ORDER BY u.id DESC
    `);

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

// export const getAllUsers = async (req, res) => {
//   try {
//     const { limit = 50 } = req.query;

//     const [users] = await db.query(
//       `SELECT id, username, email, phone, role_id, status, created_at
//        FROM users_roles
//        ORDER BY id DESC
//        LIMIT ?`,
//       [parseInt(limit)]
//     );

//     res.json(users);

//   } catch (err) {
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT id, username, email, phone, role_id, status, created_at
       FROM users_roles
       WHERE id = ?`,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [rows] = await db.query(
      `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.phone,
        u.status,
        u.created_at,
        u.last_login_at,

        r.role_name,

        e.employee_code,
        e.employee_name,
        e.email AS employee_email,
        e.phone AS employee_phone,
        e.gender,
        e.date_of_birth,
        e.address,
        e.aadhar_number,
        e.pan_number,
        e.bank_name,
        e.bank_account_number,
        e.ifsc_code,
        e.pan_card_image,
        e.aadhar_front_image,
        e.aadhar_back_image,
        e.bank_passbook_image,
        e.marksheet_10_image,
        e.marksheet_12_image,
        e.college_marksheet_image,
        e.emergency_contact_name,
        e.emergency_contact_phone,
        e.emergency_contact_relation

      FROM users_roles u
      JOIN role_based r ON r.id = u.role_id
      LEFT JOIN employees_details e ON e.user_id = u.id

      WHERE u.id = ?
    `,
      [userId],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile" || err.message,
    });
  }
};
