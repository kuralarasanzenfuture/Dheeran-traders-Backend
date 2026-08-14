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

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

/**
 * Build date filters
 */
const buildDateFilter = (query, params) => {
  const { date, from, to } = query;

  let filter = "";

  // Single date
  if (date) {
    filter += ` AND DATE(created_at) = ? `;
    params.push(date);
  }

  // From date
  if (from) {
    filter += ` AND created_at >= ? `;
    params.push(`${from} 00:00:00`);
  }

  // To date
  if (to) {
    filter += ` AND created_at <= ? `;
    params.push(`${to} 23:59:59`);
  }

  return filter;
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
        message: "Invalid latitude or longitude",
      });
    }

    // 🔥 Insert into history
    await db.query(
      `INSERT INTO user_locations_history 
       (user_id, latitude, longitude, speed, heading)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, latitude, longitude, speed, heading],
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
      [userId, latitude, longitude, speed, heading],
    );

    return res.json({
      success: true,
      message: "Location updated successfully",
    });
  } catch (error) {
    console.error("UPDATE LOCATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
        message: "Invalid user_id",
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
      [user_id],
    );

    return res.json({
      success: true,
      data: rows[0] || null,
    });
  } catch (error) {
    console.error("GET CURRENT LOCATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
        message: "Invalid user_id",
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
      [user_id, limit],
    );

    let totalDistanceMeters = 0;

    for (let i = 1; i < rows.length; i++) {
      const previous = rows[i - 1];
      const current = rows[i];

      totalDistanceMeters += getDistance(
        Number(previous.latitude),
        Number(previous.longitude),
        Number(current.latitude),
        Number(current.longitude),
      );
    }

    const totalDistanceKm = Number((totalDistanceMeters / 1000).toFixed(2));

    const firstLocation = rows.length > 0 ? rows[0].created_at : null;

    const lastLocation =
      rows.length > 0 ? rows[rows.length - 1].created_at : null;

    return res.json({
      success: true,
      user_id: user_id,
      total_distance_km: totalDistanceKm,
      first_location: firstLocation,
      last_location: lastLocation,

      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("GET HISTORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
      ORDER BY ulc.updated_at DESC`,
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("GET ALL USERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getLocationHistoryByDate = async (req, res) => {
  try {
    const { user_id } = req.params;

    let { limit = 1000, date, from, to } = req.query;

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
        Number(current.longitude),
      );
    }

    const totalDistanceKm = Number((totalDistanceMeters / 1000).toFixed(2));

    const firstLocation = rows.length > 0 ? rows[0].created_at : null;

    const lastLocation =
      rows.length > 0 ? rows[rows.length - 1].created_at : null;

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
        total_distance_meters: Math.round(totalDistanceMeters),
        total_distance_km: totalDistanceKm,
        first_location: firstLocation,
        last_location: lastLocation,
      },

      data: rows,
    });
  } catch (error) {
    console.error("GET LOCATION HISTORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * ALL USERS LOCATION REPORT
 *
 * Optional filters:
 *
 * ?user_id=10
 * ?date=2026-08-14
 * ?from=2026-08-01&to=2026-08-14
 */
// export const getAllUsersLocationReport = async (req, res) => {
//   try {
//     const { user_id, date, from, to } = req.query;

//     let query = `
//         SELECT
//           user_id,
//           latitude,
//           longitude,
//           speed,
//           heading,
//           accuracy,
//           created_at
//         FROM user_locations_history
//         WHERE 1 = 1
//       `;

//     const params = [];

//     // User filter
//     if (user_id) {
//       if (isNaN(user_id)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid user_id",
//         });
//       }

//       query += `
//           AND user_id = ?
//         `;

//       params.push(user_id);
//     }

//     // Date filters
//     query += buildDateFilter({ date, from, to }, params);

//     query += `
//         ORDER BY user_id ASC, created_at ASC
//       `;

//     const [rows] = await db.query(query, params);

//     /**
//      * Group records user-wise
//      */
//     const users = {};

//     for (const row of rows) {
//       const id = Number(row.user_id);

//       if (!users[id]) {
//         users[id] = {
//           user_id: id,
//           total_points: 0,
//           total_distance_meters: 0,
//           total_speed: 0,
//           max_speed: 0,
//           first_location: null,
//           last_location: null,
//           data: [],
//         };
//       }

//       users[id].data.push(row);
//       users[id].total_points++;

//       const speed = Number(row.speed || 0);

//       users[id].total_speed += speed;

//       if (speed > users[id].max_speed) {
//         users[id].max_speed = speed;
//       }
//     }

//     /**
//      * Calculate distance user-wise
//      */
//     for (const id of Object.keys(users)) {
//       const user = users[id];

//       for (let i = 1; i < user.data.length; i++) {
//         const previous = user.data[i - 1];

//         const current = user.data[i];

//         user.total_distance_meters += getDistance(
//           Number(previous.latitude),
//           Number(previous.longitude),
//           Number(current.latitude),
//           Number(current.longitude),
//         );
//       }

//       if (user.data.length > 0) {
//         user.first_location = user.data[0].created_at;

//         user.last_location = user.data[user.data.length - 1].created_at;
//       }

//       user.total_distance_meters = Math.round(user.total_distance_meters);

//       user.total_distance_km = Number(
//         (user.total_distance_meters / 1000).toFixed(2),
//       );

//       user.average_speed =
//         user.total_points > 0
//           ? Number((user.total_speed / user.total_points).toFixed(2))
//           : 0;

//       delete user.total_speed;
//     }

//     return res.status(200).json({
//       success: true,

//       filters: {
//         user_id: user_id ? Number(user_id) : null,
//         date: date || null,
//         from: from || null,
//         to: to || null,
//       },

//       total_users: Object.keys(users).length,

//       total_points: rows.length,

//       data: Object.values(users),
//     });
//   } catch (error) {
//     console.error("GET ALL USERS LOCATION REPORT ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

/* display day by date */

// export const getAllUsersLocationReport = async (req, res) => {
//   try {
//     const { user_id, date, from, to } = req.query;

//     let query = `
//       SELECT
//         user_id,
//         latitude,
//         longitude,
//         speed,
//         heading,
//         accuracy,
//         created_at
//       FROM user_locations_history
//       WHERE 1 = 1
//     `;

//     const params = [];

//     // ======================================================
//     // USER FILTER
//     // ======================================================

//     if (user_id) {
//       if (!/^\d+$/.test(String(user_id))) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid user_id",
//         });
//       }

//       query += `
//         AND user_id = ?
//       `;

//       params.push(Number(user_id));
//     }

//     // ======================================================
//     // DATE FILTER
//     // ======================================================

//     query += buildDateFilter({ date, from, to }, params);

//     // ======================================================
//     // ORDER
//     // ======================================================

//     query += `
//       ORDER BY user_id ASC, created_at ASC
//     `;

//     const [rows] = await db.query(query, params);

//     // ======================================================
//     // GROUP USER -> DAY
//     // ======================================================

//     const users = {};

//     for (const row of rows) {
//       const userId = Number(row.user_id);

//       /*
//        * Get date from created_at.
//        *
//        * MySQL normally returns DATETIME as:
//        * 2026-08-14 09:30:00
//        */

//       const createdAt =
//         row.created_at instanceof Date
//           ? row.created_at
//           : new Date(row.created_at);

//       const dateKey = createdAt.toISOString().split("T")[0];

//       // ====================================================
//       // CREATE USER
//       // ====================================================

//       if (!users[userId]) {
//         users[userId] = {
//           user_id: userId,
//           total_points: 0,
//           total_distance_meters: 0,
//           total_distance_km: 0,
//           average_speed: 0,
//           max_speed: 0,
//           first_location: null,
//           last_location: null,
//           days: {},
//         };
//       }

//       const user = users[userId];

//       // ====================================================
//       // CREATE DAY
//       // ====================================================

//       if (!user.days[dateKey]) {
//         user.days[dateKey] = {
//           date: dateKey,

//           total_points: 0,

//           total_distance_meters: 0,
//           total_distance_km: 0,

//           average_speed: 0,
//           max_speed: 0,

//           first_location: null,
//           last_location: null,

//           locations: [],
//         };
//       }

//       const day = user.days[dateKey];

//       // ====================================================
//       // ADD LOCATION
//       // ====================================================

//       day.locations.push({
//         latitude: Number(row.latitude),
//         longitude: Number(row.longitude),
//         speed: Number(row.speed || 0),
//         heading: Number(row.heading || 0),
//         accuracy: row.accuracy !== null ? Number(row.accuracy) : null,
//         created_at: row.created_at,
//       });

//       // ====================================================
//       // POINT COUNT
//       // ====================================================

//       day.total_points++;

//       user.total_points++;

//       // ====================================================
//       // SPEED
//       // ====================================================

//       const speed = Number(row.speed || 0);

//       day._total_speed = (day._total_speed || 0) + speed;

//       if (speed > day.max_speed) {
//         day.max_speed = speed;
//       }

//       if (speed > user.max_speed) {
//         user.max_speed = speed;
//       }

//       // ====================================================
//       // FIRST / LAST LOCATION
//       // ====================================================

//       if (!day.first_location) {
//         day.first_location = row.created_at;
//       }

//       day.last_location = row.created_at;

//       if (!user.first_location) {
//         user.first_location = row.created_at;
//       }

//       user.last_location = row.created_at;
//     }

//     // ======================================================
//     // CALCULATE USER + DAY STATISTICS
//     // ======================================================

//     for (const userId of Object.keys(users)) {
//       const user = users[userId];

//       let userTotalSpeed = 0;

//       for (const dateKey of Object.keys(user.days)) {
//         const day = user.days[dateKey];

//         // ================================================
//         // DISTANCE FOR THIS DAY ONLY
//         // ================================================

//         for (let i = 1; i < day.locations.length; i++) {
//           const previous = day.locations[i - 1];

//           const current = day.locations[i];

//           /*
//            * Optional validation
//            */

//           if (
//             !isValidLatLng(previous.latitude, previous.longitude) ||
//             !isValidLatLng(current.latitude, current.longitude)
//           ) {
//             continue;
//           }

//           day.total_distance_meters += getDistance(
//             previous.latitude,
//             previous.longitude,
//             current.latitude,
//             current.longitude,
//           );
//         }

//         // ================================================
//         // DAY DISTANCE
//         // ================================================

//         day.total_distance_meters = Math.round(day.total_distance_meters);

//         day.total_distance_km = Number(
//           (day.total_distance_meters / 1000).toFixed(2),
//         );

//         // ================================================
//         // DAY AVERAGE SPEED
//         // ================================================

//         day.average_speed =
//           day.total_points > 0
//             ? Number((day._total_speed / day.total_points).toFixed(2))
//             : 0;

//         // ================================================
//         // USER TOTAL DISTANCE
//         // ================================================

//         user.total_distance_meters += day.total_distance_meters;

//         userTotalSpeed += day._total_speed;

//         // ================================================
//         // REMOVE INTERNAL FIELD
//         // ================================================

//         delete day._total_speed;
//       }

//       // ====================================================
//       // USER TOTAL DISTANCE
//       // ====================================================

//       user.total_distance_meters = Math.round(user.total_distance_meters);

//       user.total_distance_km = Number(
//         (user.total_distance_meters / 1000).toFixed(2),
//       );

//       // ====================================================
//       // USER AVERAGE SPEED
//       // ====================================================

//       user.average_speed =
//         user.total_points > 0
//           ? Number((userTotalSpeed / user.total_points).toFixed(2))
//           : 0;

//       // ====================================================
//       // CONVERT DAYS OBJECT TO ARRAY
//       // ====================================================

//       user.days = Object.values(user.days);

//       // Sort newest day first
//       user.days.sort((a, b) => new Date(b.date) - new Date(a.date));
//     }

//     // ======================================================
//     // RESPONSE
//     // ======================================================

//     return res.status(200).json({
//       success: true,

//       filters: {
//         user_id: user_id ? Number(user_id) : null,

//         date: date || null,

//         from: from || null,

//         to: to || null,
//       },

//       total_users: Object.keys(users).length,

//       total_points: rows.length,

//       data: Object.values(users),
//     });
//   } catch (error) {
//     console.error("GET ALL USERS LOCATION REPORT ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

/* display user details */

const buildLocationDateFilter = (query, params) => {
  const { date, from, to } = query;

  let filter = "";

  // Single date
  if (date) {
    filter += `
      AND DATE(ulh.created_at) = ?
    `;

    params.push(date);
  }

  // From date
  if (from) {
    filter += `
      AND ulh.created_at >= ?
    `;

    params.push(`${from} 00:00:00`);
  }

  // To date
  if (to) {
    filter += `
      AND ulh.created_at <= ?
    `;

    params.push(`${to} 23:59:59`);
  }

  return filter;
};

export const getAllUsersLocationReport = async (req, res) => {
  try {
    const { user_id, date, from, to } = req.query;

    let query = `
      SELECT
        ulh.user_id,

        /* USER DETAILS */
        ur.username,
        ur.email,
        ur.phone,
        ur.role_id,
        ur.status,
        ur.is_online,
        ur.last_seen,
        ur.last_login_at,

        /* LOCATION DETAILS */
        ulh.latitude,
        ulh.longitude,
        ulh.speed,
        ulh.heading,
        ulh.accuracy,
        ulh.created_at

      FROM user_locations_history ulh

      INNER JOIN users_roles ur
        ON ur.id = ulh.user_id

      WHERE 1 = 1
    `;

    const params = [];

    // ======================================================
    // USER FILTER
    // ======================================================

    if (user_id) {
      if (!/^\d+$/.test(String(user_id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid user_id",
        });
      }

      query += `
        AND ulh.user_id = ?
      `;

      params.push(Number(user_id));
    }

    // ======================================================
    // DATE FILTER
    // ======================================================

    query += buildLocationDateFilter({ date, from, to }, params);

    // ======================================================
    // ORDER
    // ======================================================

    query += `
      ORDER BY
        ulh.user_id ASC,
        ulh.created_at ASC
    `;

    const [rows] = await db.query(query, params);

    // ======================================================
    // GROUP USER -> DAY
    // ======================================================

    const users = {};

    for (const row of rows) {
      const userId = Number(row.user_id);

      /*
       * IMPORTANT:
       * Keep the date based on the DB timestamp.
       *
       * If your MySQL connection already uses
       * +05:30 timezone, avoid unnecessary UTC
       * conversion here.
       */

      const dateKey =
        row.created_at instanceof Date
          ? formatDate(row.created_at)
          : String(row.created_at).substring(0, 10);

      // ====================================================
      // CREATE USER
      // ====================================================

      if (!users[userId]) {
        users[userId] = {
          user_id: userId,

          // USER DETAILS
          username: row.username,
          email: row.email,
          phone: row.phone,
          role_id: row.role_id,
          status: row.status,
          is_online: Boolean(row.is_online),
          last_seen: row.last_seen,
          last_login_at: row.last_login_at,

          // TOTAL REPORT
          total_points: 0,

          total_distance_meters: 0,
          total_distance_km: 0,

          average_speed: 0,
          max_speed: 0,

          first_location: null,
          last_location: null,

          days: {},
        };
      }

      const user = users[userId];

      // ====================================================
      // CREATE DAY
      // ====================================================

      if (!user.days[dateKey]) {
        user.days[dateKey] = {
          date: dateKey,

          total_points: 0,

          total_distance_meters: 0,
          total_distance_km: 0,

          average_speed: 0,
          max_speed: 0,

          first_location: null,
          last_location: null,

          locations: [],

          // INTERNAL
          _total_speed: 0,
        };
      }

      const day = user.days[dateKey];

      // ====================================================
      // LOCATION
      // ====================================================

      day.locations.push({
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),

        speed: Number(row.speed || 0),

        heading: Number(row.heading || 0),

        accuracy: row.accuracy !== null ? Number(row.accuracy) : null,

        created_at: row.created_at,
      });

      // ====================================================
      // POINT COUNT
      // ====================================================

      day.total_points++;

      user.total_points++;

      // ====================================================
      // SPEED
      // ====================================================

      const speed = Number(row.speed || 0);

      day._total_speed += speed;

      if (speed > day.max_speed) {
        day.max_speed = speed;
      }

      if (speed > user.max_speed) {
        user.max_speed = speed;
      }

      // ====================================================
      // FIRST / LAST LOCATION
      // ====================================================

      if (!day.first_location) {
        day.first_location = row.created_at;
      }

      day.last_location = row.created_at;

      if (!user.first_location) {
        user.first_location = row.created_at;
      }

      user.last_location = row.created_at;
    }

    // ======================================================
    // CALCULATE USER + DAY STATISTICS
    // ======================================================

    for (const userId of Object.keys(users)) {
      const user = users[userId];

      let userTotalSpeed = 0;

      // ====================================================
      // EACH DAY
      // ====================================================

      for (const dateKey of Object.keys(user.days)) {
        const day = user.days[dateKey];

        // ================================================
        // CALCULATE DISTANCE
        // ================================================

        for (let i = 1; i < day.locations.length; i++) {
          const previous = day.locations[i - 1];

          const current = day.locations[i];

          if (
            !isValidLatLng(previous.latitude, previous.longitude) ||
            !isValidLatLng(current.latitude, current.longitude)
          ) {
            continue;
          }

          day.total_distance_meters += getDistance(
            previous.latitude,
            previous.longitude,
            current.latitude,
            current.longitude,
          );
        }

        // ================================================
        // DISTANCE
        // ================================================

        day.total_distance_meters = Math.round(day.total_distance_meters);

        day.total_distance_km = Number(
          (day.total_distance_meters / 1000).toFixed(2),
        );

        // ================================================
        // AVERAGE SPEED
        // ================================================

        day.average_speed =
          day.total_points > 0
            ? Number((day._total_speed / day.total_points).toFixed(2))
            : 0;

        // ================================================
        // USER TOTAL DISTANCE
        // ================================================

        user.total_distance_meters += day.total_distance_meters;

        userTotalSpeed += day._total_speed;

        // ================================================
        // REMOVE INTERNAL FIELD
        // ================================================

        delete day._total_speed;
      }

      // ====================================================
      // USER TOTAL DISTANCE
      // ====================================================

      user.total_distance_meters = Math.round(user.total_distance_meters);

      user.total_distance_km = Number(
        (user.total_distance_meters / 1000).toFixed(2),
      );

      // ====================================================
      // USER AVERAGE SPEED
      // ====================================================

      user.average_speed =
        user.total_points > 0
          ? Number((userTotalSpeed / user.total_points).toFixed(2))
          : 0;

      // ====================================================
      // DAYS ARRAY
      // ====================================================

      user.days = Object.values(user.days);

      // Newest day first
      user.days.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(200).json({
      success: true,

      filters: {
        user_id: user_id ? Number(user_id) : null,

        date: date || null,

        from: from || null,

        to: to || null,
      },

      total_users: Object.keys(users).length,

      total_points: rows.length,

      data: Object.values(users),
    });
  } catch (error) {
    console.error("GET ALL USERS LOCATION REPORT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
