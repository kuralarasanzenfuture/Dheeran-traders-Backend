import db from "../../config/db.js";

export const updateLocation = async (req, res) => {
  try {
    const { user_id, latitude, longitude } = req.body;

    if (!user_id || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "user_id, latitude, longitude required"
      });
    }

    await db.query(
      `INSERT INTO user_locations (user_id, latitude, longitude) VALUES (?, ?, ?)`,
      [user_id, latitude, longitude]
    );

    res.json({
      success: true,
      message: "Location updated"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// export const getUserLocation = async (req, res) => {
//   try {
//     const { user_id } = req.params;

//     const [rows] = await db.query(
//       `SELECT * FROM user_locations 
//        WHERE user_id = ? 
//        ORDER BY created_at DESC 
//        LIMIT 1`,
//       [user_id]
//     );

//     res.json(rows[0]);

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const getUserLocation = async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM user_locations 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [user_id]
    );

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
