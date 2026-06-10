import db from "../config/db.js";

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );
}

/* ======================================================
   COMMON VALIDATIONS
====================================================== */

const isValidNumber = (val) => {
  return typeof val === "number" && !isNaN(val);
};

const isValidLatLng = (lat, lng) => {
  return (
    isValidNumber(lat) &&
    isValidNumber(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

/* ======================================================
   UPDATE LOCATION
====================================================== */

export const updateLocation = async (req, res) => {
  try {
    const userId = req.user?.id;
    let { latitude, longitude, speed = 0, heading = 0 } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    latitude = Number(latitude);
    longitude = Number(longitude);
    speed = Number(speed);
    heading = Number(heading);

    if (!isValidLatLng(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude"
      });
    }

    // 🔥 Insert into history
    await db.query(
      `INSERT INTO user_locations_history 
       (user_id, latitude, longitude, speed, heading)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, latitude, longitude, speed, heading]
    );

    // 🔥 Update current location
    await db.query(
      `INSERT INTO user_locations_current 
       (user_id, latitude, longitude, speed, heading, is_online)
       VALUES (?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE
         latitude = VALUES(latitude),
         longitude = VALUES(longitude),
         speed = VALUES(speed),
         heading = VALUES(heading),
         is_online = TRUE,
         updated_at = NOW()`,
      [userId, latitude, longitude, speed, heading]
    );

    return res.json({
      success: true,
      message: "Location updated successfully"
    });

  } catch (error) {
    console.error("UPDATE LOCATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/* ======================================================
   GET CURRENT LOCATION (SINGLE USER)
====================================================== */

export const getCurrentLocation = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id"
      });
    }

    const [rows] = await db.query(
      `SELECT 
        ulc.user_id,
        ulc.latitude,
        ulc.longitude,
        ulc.speed,
        ulc.heading,
        ulc.is_online,
        ulc.updated_at,
        u.username,
        u.email,
        u.phone,
        u.role_id
      FROM user_locations_current ulc
      LEFT JOIN users_roles u ON u.id = ulc.user_id
      WHERE ulc.user_id = ?`,
      [user_id]
    );

    return res.json({
      success: true,
      data: rows[0] || null
    });

  } catch (error) {
    console.error("GET CURRENT LOCATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/* ======================================================
   GET LOCATION HISTORY
====================================================== */

export const getLocationHistory = async (req, res) => {
  try {
    const { user_id } = req.params;
    let { limit = 100 } = req.query;

    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id"
      });
    }

    limit = Number(limit);
    if (isNaN(limit) || limit <= 0 || limit > 1000) {
      limit = 100;
    }

    const [rows] = await db.query(
      `SELECT 
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        created_at
      FROM user_locations_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
      [user_id, limit]
    );

     let totalDistanceMeters = 0;

    for (let i = 1; i < rows.length; i++) {
      const previous = rows[i - 1];
      const current = rows[i];

      totalDistanceMeters += getDistance(
        Number(previous.latitude),
        Number(previous.longitude),
        Number(current.latitude),
        Number(current.longitude)
      );
    }

    const totalDistanceKm = Number(
      (totalDistanceMeters / 1000).toFixed(2)
    );

    const firstLocation =
      rows.length > 0
        ? rows[0].created_at
        : null;

    const lastLocation =
      rows.length > 0
        ? rows[rows.length - 1].created_at
        : null;

    return res.json({
      success: true,
      user_id: user_id,
      total_distance_km: totalDistanceKm,
      first_location: firstLocation,
      last_location: lastLocation,

      count: rows.length,
      data: rows
    });

  } catch (error) {
    console.error("GET HISTORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/* ======================================================
   GET ALL USERS CURRENT LOCATION
====================================================== */

export const getAllUsersCurrentLocation = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        ulc.user_id,
        ulc.latitude,
        ulc.longitude,
        ulc.speed,
        ulc.heading,
        ulc.is_online,
        ulc.updated_at,
        u.username,
        u.email,
        u.phone,
        u.role_id
      FROM user_locations_current ulc
      LEFT JOIN users_roles u ON u.id = ulc.user_id
      ORDER BY ulc.updated_at DESC`
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    console.error("GET ALL USERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const getLocationHistoryByDate = async (req, res) => {
  try {
    const { user_id } = req.params;

    let {
      limit = 1000,
      date,
      from,
      to,
    } = req.query;

    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id",
      });
    }

    limit = Number(limit);

    if (isNaN(limit) || limit <= 0 || limit > 10000) {
      limit = 1000;
    }

    let query = `
      SELECT
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        created_at
      FROM user_locations_history
      WHERE user_id = ?
    `;

    const params = [user_id];

    // Single date filter
    if (date) {
      query += `
        AND DATE(created_at) = ?
      `;
      params.push(date);
    }

    // Date range filter
    if (from) {
      query += `
        AND created_at >= ?
      `;
      params.push(`${from} 00:00:00`);
    }

    if (to) {
      query += `
        AND created_at <= ?
      `;
      params.push(`${to} 23:59:59`);
    }

    query += `
      ORDER BY created_at ASC
      LIMIT ?
    `;

    params.push(limit);

    const [rows] = await db.query(query, params);

    let totalDistanceMeters = 0;

    for (let i = 1; i < rows.length; i++) {
      const previous = rows[i - 1];
      const current = rows[i];

      totalDistanceMeters += getDistance(
        Number(previous.latitude),
        Number(previous.longitude),
        Number(current.latitude),
        Number(current.longitude)
      );
    }

    const totalDistanceKm = Number(
      (totalDistanceMeters / 1000).toFixed(2)
    );

    const firstLocation =
      rows.length > 0
        ? rows[0].created_at
        : null;

    const lastLocation =
      rows.length > 0
        ? rows[rows.length - 1].created_at
        : null;

    return res.status(200).json({
      success: true,

      user_id: Number(user_id),
      count: rows.length,
      filters: {
        date: date || null,
        from: from || null,
        to: to || null,
      },

      summary: {
        total_points: rows.length,
        total_distance_meters: Math.round(
          totalDistanceMeters
        ),
        total_distance_km: totalDistanceKm,
        first_location: firstLocation,
        last_location: lastLocation,
      },

      data: rows,
    });
  } catch (error) {
    console.error(
      "GET LOCATION HISTORY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};