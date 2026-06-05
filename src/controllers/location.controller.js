// import db from "../../config/db.js";

// export const updateLocation = async (req, res) => {
//   try {
//     const { user_id, latitude, longitude } = req.body;

//     if (!user_id || !latitude || !longitude) {
//       return res.status(400).json({
//         success: false,
//         message: "user_id, latitude, longitude required"
//       });
//     }

//     await db.query(
//       `INSERT INTO user_locations (user_id, latitude, longitude) VALUES (?, ?, ?)`,
//       [user_id, latitude, longitude]
//     );

//     res.json({
//       success: true,
//       message: "Location updated"
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // export const getUserLocation = async (req, res) => {
// //   try {
// //     const { user_id } = req.params;

// //     const [rows] = await db.query(
// //       `SELECT * FROM user_locations 
// //        WHERE user_id = ? 
// //        ORDER BY created_at DESC 
// //        LIMIT 1`,
// //       [user_id]
// //     );

// //     res.json(rows[0]);

// //   } catch (error) {
// //     res.status(500).json({ message: error.message });
// //   }
// // };

// export const getUserLocation = async (req, res) => {
//   try {
//     const { user_id } = req.params;

//     const [rows] = await db.query(
//       `SELECT * FROM user_locations 
//        WHERE user_id = ? 
//        ORDER BY created_at DESC`,
//       [user_id]
//     );

//     res.json({
//       success: true,
//       data: rows
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

import db from "../config/db.js";

export const updateLocation = async (req, res) => {
  try {
    const { user_id, latitude, longitude } = req.body;

    if (!user_id || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "user_id, latitude and longitude required"
      });
    }

    // 1️⃣ Insert into history
    await db.query(
      `INSERT INTO user_locations_history (user_id, latitude, longitude)
       VALUES (?, ?, ?)`,
      [user_id, latitude, longitude]
    );

    // 2️⃣ Update current location
    await db.query(
      `INSERT INTO user_locations_current (user_id, latitude, longitude)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
       latitude = VALUES(latitude),
       longitude = VALUES(longitude),
       updated_at = CURRENT_TIMESTAMP`,
      [user_id, latitude, longitude]
    );

    res.json({
      success: true,
      message: "Location updated successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// export const getCurrentLocation = async (req, res) => {
//   try {
//     const { user_id } = req.params;

//     const [rows] = await db.query(`
//       SELECT 
//         ulc.user_id,
//         ulc.latitude,
//         ulc.longitude,
//         ulc.updated_at,
//         u.username,
//         u.email,
//         u.phone,
//         u.is_online,
//         r.role_name
//       FROM user_locations_current ulc
//       LEFT JOIN users_roles u ON u.id = ulc.user_id
//       LEFT JOIN role_based r ON r.id = u.role_id
//       WHERE ulc.user_id = ?
//     `, [user_id]);

//     res.json({
//       success: true,
//       data: rows[0] || null
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

export const getCurrentLocation = async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await db.query(`
      SELECT 
        ulc.user_id,
        ulc.latitude,
        ulc.longitude,
        ulc.updated_at,
        u.username,
        u.email,
        u.phone,
        CASE WHEN u.is_online = 1 THEN true ELSE false END AS is_online,
        r.role_name
      FROM user_locations_current ulc
      LEFT JOIN users_roles u ON u.id = ulc.user_id
      LEFT JOIN role_based r ON r.id = u.role_id
      WHERE ulc.user_id = ?
    `, [user_id]);

    res.json({
      success: true,
      data: rows[0] || null
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getLocationHistory = async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM user_locations_history
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [user_id]
    );

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAllUsersCurrentLocation = async (req, res) => {
  try {

    const [rows] = await db.query(`
      SELECT 
        ulc.user_id,
        ulc.latitude,
        ulc.longitude,
        ulc.updated_at,
        u.username,
        u.email,
        u.phone,
        u.is_online,
        u.role_id
      FROM user_locations_current ulc
      LEFT JOIN users_roles u ON u.id = ulc.user_id
    `);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
