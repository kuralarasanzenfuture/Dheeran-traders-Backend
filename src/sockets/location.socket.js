// import db from "../config/db.js";

// export const locationSocket = (io) => {

//   io.on("connection", (socket) => {
//     console.log("Client connected:", socket.id);

//     // Receive staff location
//     socket.on("staffLocation", async (data) => {
//       try {

//         const { staff_id, latitude, longitude } = data;

//         if (!staff_id || !latitude || !longitude) {
//           return;
//         }

//         // Save to database
//         await db.query(
//           `INSERT INTO user_locations (user_id, latitude, longitude)
//            VALUES (?, ?, ?)`,
//           [staff_id, latitude, longitude]
//         );

//         // Send update to admin dashboard
//         io.emit("staffLocationUpdate", data);

//       } catch (error) {
//         console.error("Location socket error:", error);
//       }
//     });

//     socket.on("disconnect", () => {
//       console.log("Client disconnected:", socket.id);
//     });

//   });

// };

// import db from "../config/db.js";

// export const locationSocket = (io) => {

//   console.log("✅ Socket.IO initialized");

//   io.on("connection", (socket) => {

//     console.log("🟢 Client connected:", socket.id);

//     socket.on("staffLocation", async (data) => {
//       console.log("📍 Location received:", data);

//       const { user_id, latitude, longitude } = data;

//       await db.query(
//         `INSERT INTO user_locations (user_id, latitude, longitude)
//          VALUES (?, ?, ?)`,
//         [user_id, latitude, longitude]
//       );

//       io.emit("staffLocationUpdate", data);
//     });

//     socket.on("disconnect", () => {
//       console.log("🔴 Client disconnected:", socket.id);
//     });

//   });

// };

// import db from "../config/db.js";

// export const locationSocket = (io) => {

//   console.log("✅ Socket.IO initialized");

//   io.on("connection", (socket) => {

//     console.log("🟢 Client connected:", socket.id);

//     socket.on("staffLocation", async (data) => {
//       try {

//         const { user_id, latitude, longitude } = data;

//         if (!user_id || !latitude || !longitude) return;

//         // update current location
//         await db.query(
//           `INSERT INTO user_locations_current (user_id, latitude, longitude)
//            VALUES (?, ?, ?)
//            ON DUPLICATE KEY UPDATE
//            latitude = VALUES(latitude),
//            longitude = VALUES(longitude),
//            updated_at = CURRENT_TIMESTAMP`,
//           [user_id, latitude, longitude]
//         );

//         // randomly store history (example: every ~30 seconds)
//         // if (Math.random() < 0.2) {
//           await db.query(
//             `INSERT INTO user_locations_history (user_id, latitude, longitude)
//              VALUES (?, ?, ?)`,
//             [user_id, latitude, longitude]
//           );
//         // }

//         io.emit("staffLocationUpdate", data);

//       } catch (error) {
//         console.error("Socket error:", error);
//       }
//     });

//     socket.on("disconnect", () => {
//       console.log("🔴 Client disconnected:", socket.id);
//     });

//   });

// };
// import db from "../config/db.js";
// import jwt from "jsonwebtoken";

// const LOCATION_INTERVAL = 5000;
// const HISTORY_INTERVAL = 30000;
// const ONLINE_THRESHOLD = 10000;

// export const locationSocket = (io) => {

//   console.log("🚀 Socket.IO initialized");

//   // ================= AUTH =================
//   io.use((socket, next) => {
//     try {
//       const token = socket.handshake.auth?.token;

//       if (!token) {
//         console.log("❌ AUTH: No token");
//         return next(new Error("Unauthorized"));
//       }

//       const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

//       socket.user = {
//         id: decoded.id,
//         role: decoded.role,
//       };

//       console.log(`🔐 AUTH OK → User:${decoded.id} Role:${decoded.role}`);

//       next();
//     } catch (err) {
//       console.log("❌ AUTH FAILED:", err.message);
//       next(new Error("Unauthorized"));
//     }
//   });

//   // ================= CONNECTION =================
//   io.on("connection", async (socket) => {

//     const userId = socket.user.id;
//     const role = socket.user.role;

//     console.log(`🟢 CONNECT → User:${userId} Role:${role}`);

//     // join rooms
//     if (role === "ADMIN") {
//       socket.join("admins");
//     } else {
//       socket.join(`user_${userId}`);
//     }

//     // mark last seen
//     await db.query(
//       `UPDATE users_roles SET is_online = 1, last_seen = NOW() WHERE id = ?`,
//       [userId]
//     );

//     const lastLocationUpdate = new Map();
//     const lastHistoryInsert = new Map();

//     // ================= LOCATION =================
//     socket.on("staffLocation", async (data) => {

//       const startTime = Date.now();

//       console.log(`📥 [${userId}] RAW:`, data);

//       try {
//         let { latitude, longitude } = data;

//         latitude = parseFloat(latitude);
//         longitude = parseFloat(longitude);

//         // ===== VALIDATION =====
//         if (
//           latitude == null ||
//           longitude == null ||
//           isNaN(latitude) ||
//           isNaN(longitude)
//         ) {
//           console.log(`⚠️ [${userId}] INVALID GPS`);
//           return;
//         }

//         const now = Date.now();

//         // ===== THROTTLE =====
//         const lastUpdate = lastLocationUpdate.get(userId) || 0;

//         if (now - lastUpdate < LOCATION_INTERVAL) {
//           console.log(`⏱️ [${userId}] THROTTLED (${now - lastUpdate}ms)`);
//           return;
//         }

//         lastLocationUpdate.set(userId, now);

//         console.log(`✅ [${userId}] VALID LOCATION (${latitude}, ${longitude})`);

//         // ===== DB CURRENT =====
//         await db.query(
//           `INSERT INTO user_locations_current (user_id, latitude, longitude)
//            VALUES (?, ?, ?)
//            ON DUPLICATE KEY UPDATE
//              latitude = VALUES(latitude),
//              longitude = VALUES(longitude),
//              updated_at = CURRENT_TIMESTAMP`,
//           [userId, latitude, longitude]
//         );

//         console.log(`💾 [${userId}] CURRENT UPDATED`);

//         // ===== HISTORY =====
//         const lastHistory = lastHistoryInsert.get(userId) || 0;

//         if (now - lastHistory > HISTORY_INTERVAL) {
//           await db.query(
//             `INSERT INTO user_locations_history (user_id, latitude, longitude)
//              VALUES (?, ?, ?)`,
//             [userId, latitude, longitude]
//           );

//           lastHistoryInsert.set(userId, now);

//           console.log(`📚 [${userId}] HISTORY INSERTED`);
//         }

//         // ===== STATUS CALC =====
//         const status = "ONLINE";

//         // ===== EMIT =====
//         const payload = {
//           user_id: userId,
//           latitude,
//           longitude,
//           status,
//           timestamp: new Date(),
//         };

//         io.to("admins").emit("staffLocationUpdate", payload);

//         console.log(`📡 [${userId}] EMITTED → ADMINS`);

//         // ===== PERF =====
//         console.log(`⚡ [${userId}] PROCESS TIME: ${Date.now() - startTime}ms`);

//       } catch (error) {
//         console.error(`❌ [${userId}] ERROR:`, error.message);
//       }
//     });

//     // ================= DISCONNECT =================
//     socket.on("disconnect", async (reason) => {

//       console.log(`🔴 DISCONNECT → User:${userId} Reason:${reason}`);

//       await db.query(
//         `UPDATE users_roles SET is_online = 0, last_seen = NOW() WHERE id = ?`,
//         [userId]
//       );

//     });

//   });

//   // ================= BACKGROUND STATUS CHECK =================
//   setInterval(async () => {
//     try {
//       const [rows] = await db.query(`
//         SELECT user_id, updated_at
//         FROM user_locations_current
//       `);

//       const now = Date.now();

//       rows.forEach((row) => {
//         const last = new Date(row.updated_at).getTime();
//         const diff = now - last;

//         let status = "OFFLINE";

//         if (diff <= 10000) status = "ONLINE";
//         else if (diff <= 60000) status = "IDLE";

//         console.log(`📊 STATUS → User:${row.user_id} = ${status}`);
//       });

//     } catch (err) {
//       console.error("❌ STATUS CHECK ERROR:", err.message);
//     }
//   }, 15000);

// };

/* ======================================================*/

// import db from "../config/db.js";
// import jwt from "jsonwebtoken";

// function getDistance(lat1, lon1, lat2, lon2) {
//   const R = 6371000;

//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLon = ((lon2 - lon1) * Math.PI) / 180;

//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos((lat1 * Math.PI) / 180) *
//       Math.cos((lat2 * Math.PI) / 180) *
//       Math.sin(dLon / 2) *
//       Math.sin(dLon / 2);

//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// const LOCATION_INTERVAL = 5000; // 5 sec     // throttle current update
// const HISTORY_INTERVAL = 30000; // 30 sec    // history insert
// const ONLINE_THRESHOLD = 10000; // online detection
// const MIN_DISTANCE = 50; // meters

// export const locationSocket = (io) => {
//   console.log("🚀 Socket.IO initialized");

//   /* ================= AUTH ================= */
//   io.use((socket, next) => {
//     try {
//       const token = socket.handshake.auth?.token;

//       if (!token) {
//         console.log("❌ AUTH: No token");
//         return next(new Error("Unauthorized"));
//       }

//       const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

//       socket.user = {
//         id: decoded.id,
//         role: decoded.role,
//       };

//       console.log(`🔐 AUTH OK → User:${decoded.id}`);
//       next();
//     } catch (err) {
//       console.log("❌ AUTH FAILED:", err.message);
//       next(new Error("Unauthorized"));
//     }
//   });

//   const lastLocations = new Map();

//   /* ================= CONNECTION ================= */
//   io.on("connection", async (socket) => {
//     const userId = socket.user.id;
//     const role = socket.user.role;

//     console.log(`🟢 CONNECT → User:${userId}`);

//     if (role === "ADMIN") {
//       socket.join("admins");
//     } else {
//       socket.join(`user_${userId}`);
//     }

//     // mark online
//     await db.query(
//       `UPDATE users_roles SET is_online = 1, last_seen = NOW() WHERE id = ?`,
//       [userId],
//     );

//     const lastLocationUpdate = new Map();
//     const lastHistoryInsert = new Map();

//     /* ================= LOCATION EVENT ================= */
//     // socket.on("staffLocation", async (data) => {
//     //   const start = Date.now();

//     //   try {
//     //     let { latitude, longitude, speed = 0, heading = 0 } = data;

//     //     latitude = Number(latitude);
//     //     longitude = Number(longitude);
//     //     speed = Number(speed);
//     //     heading = Number(heading);

//     //     // ===== VALIDATION =====
//     //     if (
//     //       !Number.isFinite(latitude) ||
//     //       !Number.isFinite(longitude) ||
//     //       latitude < -90 ||
//     //       latitude > 90 ||
//     //       longitude < -180 ||
//     //       longitude > 180
//     //     ) {
//     //       console.log(`⚠️ INVALID GPS → User:${userId}`, data);
//     //       return;
//     //     }

//     //     const now = Date.now();

//     //     // ===== THROTTLE =====
//     //     const lastUpdate = lastLocationUpdate.get(userId) || 0;
//     //     if (now - lastUpdate < LOCATION_INTERVAL) {
//     //       return;
//     //     }
//     //     lastLocationUpdate.set(userId, now);

//     //     // ===== CURRENT LOCATION UPSERT =====
//     //     await db.query(
//     //       `INSERT INTO user_locations_current
//     //        (user_id, latitude, longitude, speed, heading, is_online)
//     //        VALUES (?, ?, ?, ?, ?, TRUE)
//     //        ON DUPLICATE KEY UPDATE
//     //          latitude = VALUES(latitude),
//     //          longitude = VALUES(longitude),
//     //          speed = VALUES(speed),
//     //          heading = VALUES(heading),
//     //          is_online = TRUE,
//     //          updated_at = NOW()`,
//     //       [userId, latitude, longitude, speed, heading],
//     //     );

//     //     // ===== HISTORY INSERT =====
//     //     const lastHistory = lastHistoryInsert.get(userId) || 0;
//     //     if (now - lastHistory > HISTORY_INTERVAL) {
//     //       await db.query(
//     //         `INSERT INTO user_locations_history
//     //          (user_id, latitude, longitude, speed, heading)
//     //          VALUES (?, ?, ?, ?, ?)`,
//     //         [userId, latitude, longitude, speed, heading],
//     //       );

//     //       lastHistoryInsert.set(userId, now);
//     //     }

//     //     // ===== EMIT TO ADMINS =====
//     //     const payload = {
//     //       user_id: userId,
//     //       latitude,
//     //       longitude,
//     //       speed,
//     //       heading,
//     //       is_online: true,
//     //       timestamp: new Date().toISOString(),
//     //     };

//     //     io.to("admins").emit("staffLocationUpdate", payload);

//     //     // ===== CLEAN LOG =====
//     //     console.log(
//     //       `📡 [${userId}] ${latitude},${longitude} | speed:${speed} | ${Date.now() - start}ms`,
//     //     );
//     //   } catch (err) {
//     //     console.error(`❌ SOCKET ERROR [${userId}]`, err.message);
//     //   }
//     // });

//     socket.on("staffLocation", async (data) => {
//       try {
//         let { latitude, longitude, speed = 0, heading = 0 } = data;

//         latitude = Number(latitude);
//         longitude = Number(longitude);
//         speed = Number(speed);
//         heading = Number(heading);

//         if (
//           !Number.isFinite(latitude) ||
//           !Number.isFinite(longitude) ||
//           latitude < -90 ||
//           latitude > 90 ||
//           longitude < -180 ||
//           longitude > 180
//         ) {
//           return;
//         }

//         const now = Date.now();

//         // ===== 5 SEC THROTTLE =====

//         const lastUpdate = lastLocationUpdate.get(userId) || 0;

//         if (now - lastUpdate < LOCATION_INTERVAL) {
//           return;
//         }

//         // ===== DISTANCE CHECK =====

//         const previous = lastLocations.get(userId);

//         if (previous) {
//           const distance = getDistance(
//             previous.latitude,
//             previous.longitude,
//             latitude,
//             longitude,
//           );

//           if (distance < MIN_DISTANCE) {
//             return;
//           }
//         }

//         lastLocationUpdate.set(userId, now);

//         lastLocations.set(userId, {
//           latitude,
//           longitude,
//         });

//         // ===== UPDATE CURRENT LOCATION =====

//         await db.query(
//           `
//       INSERT INTO user_locations_current
//       (
//         user_id,
//         latitude,
//         longitude,
//         speed,
//         heading,
//         is_online
//       )
//       VALUES (?, ?, ?, ?, ?, TRUE)
//       ON DUPLICATE KEY UPDATE
//         latitude = VALUES(latitude),
//         longitude = VALUES(longitude),
//         speed = VALUES(speed),
//         heading = VALUES(heading),
//         is_online = TRUE,
//         updated_at = NOW()
//       `,
//           [userId, latitude, longitude, speed, heading],
//         );

//         // ===== HISTORY EVERY 30 SEC =====

//         const lastHistory = lastHistoryInsert.get(userId) || 0;

//         if (now - lastHistory > HISTORY_INTERVAL) {
//           await db.query(
//             `
//         INSERT INTO user_locations_history
//         (
//           user_id,
//           latitude,
//           longitude,
//           speed,
//           heading
//         )
//         VALUES (?, ?, ?, ?, ?)
//         `,
//             [userId, latitude, longitude, speed, heading],
//           );

//           lastHistoryInsert.set(userId, now);
//         }

//         // ===== SEND TO ADMINS =====

//         io.to("admins").emit("staffLocationUpdate", {
//           user_id: userId,
//           latitude,
//           longitude,
//           speed,
//           heading,
//           is_online: true,
//           timestamp: new Date().toISOString(),
//         });

//         console.log(`📡 USER:${userId} LAT:${latitude} LNG:${longitude}`);

//         console.log(
//           `📡 [${userId}] ${latitude},${longitude} | speed:${speed} | ${Date.now() - start}ms`,
//         );
//       } catch (err) {
//         console.error(`❌ SOCKET ERROR [${userId}]`, err.message);
//       }
//     });

//     /* ================= DISCONNECT ================= */
//     socket.on("disconnect", async (reason) => {
//       console.log(`🔴 DISCONNECT → User:${userId} (${reason})`);

//       await db.query(
//         `UPDATE users_roles SET is_online = 0, last_seen = NOW() WHERE id = ?`,
//         [userId],
//       );
//     });
//   });

//   /* ================= BACKGROUND STATUS CHECK ================= */
//   setInterval(async () => {
//     try {
//       const [rows] = await db.query(`
//         SELECT user_id, updated_at FROM user_locations_current
//       `);

//       const now = Date.now();

//       for (const row of rows) {
//         const diff = now - new Date(row.updated_at).getTime();

//         let is_online = 0;

//         if (diff <= ONLINE_THRESHOLD) {
//           is_online = 1;
//         }

//         await db.query(
//           `UPDATE user_locations_current
//            SET is_online = ?
//            WHERE user_id = ?`,
//           [is_online, row.user_id],
//         );

//         console.log(
//           `📊 STATUS → ${row.user_id} = ${is_online ? "ONLINE" : "OFFLINE"}`,
//         );
//       }
//     } catch (err) {
//       console.error("❌ STATUS CHECK ERROR:", err.message);
//     }
//   }, 15000);
// };

/* ======================================================*/

// import db from "../config/db.js";
// import jwt from "jsonwebtoken";

// const LOCATION_INTERVAL = 5000; // 5 sec
// const HISTORY_INTERVAL = 30000; // 30 sec
// const MIN_DISTANCE = 50; // meters
// const MAX_ACCURACY = 30; // meters

// const lastLocationUpdate = new Map();
// const lastHistoryInsert = new Map();
// const lastLocations = new Map();

// function getDistance(lat1, lon1, lat2, lon2) {
//   const R = 6371000;

//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLon = ((lon2 - lon1) * Math.PI) / 180;

//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos((lat1 * Math.PI) / 180) *
//       Math.cos((lat2 * Math.PI) / 180) *
//       Math.sin(dLon / 2) *
//       Math.sin(dLon / 2);

//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// export const locationSocket = (io) => {
//   console.log("🚀 Location Socket Initialized");

//   /* ================= AUTH ================= */

//   io.use((socket, next) => {
//     try {
//       const token = socket.handshake.auth?.token;

//       if (!token) {
//         return next(new Error("Unauthorized"));
//       }

//       const decoded = jwt.verify(
//         token,
//         process.env.JWT_ACCESS_SECRET
//       );

//       socket.user = {
//         id: decoded.id,
//         role: decoded.role,
//       };

//       next();
//     } catch (err) {
//       console.error("❌ AUTH ERROR:", err.message);
//       next(new Error("Unauthorized"));
//     }
//   });

//   /* ================= CONNECTION ================= */

//   io.on("connection", async (socket) => {
//     const userId = socket.user.id;
//     const role = socket.user.role;

//     console.log(`🟢 CONNECTED -> ${userId}`);

//     try {
//       await db.query(
//         `
//         UPDATE users_roles
//         SET
//           is_online = 1,
//           last_seen = NOW()
//         WHERE id = ?
//         `,
//         [userId]
//       );
//     } catch (err) {
//       console.error(err);
//     }

//     if (role === "ADMIN") {
//       socket.join("admins");
//     } else {
//       socket.join(`user_${userId}`);
//     }

//     /* ================= LOCATION EVENT ================= */

//     socket.on("staffLocation", async (data) => {
//       try {
//         let {
//           latitude,
//           longitude,
//           speed = 0,
//           heading = 0,
//           accuracy = 999,
//         } = data;

//         latitude = Number(latitude);
//         longitude = Number(longitude);
//         speed = Number(speed);
//         heading = Number(heading);
//         accuracy = Number(accuracy);

//         /* ===== GPS VALIDATION ===== */

//         if (
//           !Number.isFinite(latitude) ||
//           !Number.isFinite(longitude) ||
//           latitude < -90 ||
//           latitude > 90 ||
//           longitude < -180 ||
//           longitude > 180
//         ) {
//           return;
//         }

//         /* ===== ACCURACY CHECK ===== */

//         if (accuracy > MAX_ACCURACY) {
//           console.log(
//             `⚠️ Poor GPS Accuracy (${accuracy}m) User:${userId}`
//           );
//           return;
//         }

//         const now = Date.now();

//         /* ===== THROTTLE ===== */

//         const lastUpdate =
//           lastLocationUpdate.get(userId) || 0;

//         if (
//           now - lastUpdate <
//           LOCATION_INTERVAL
//         ) {
//           return;
//         }

//         /* ===== DISTANCE CHECK ===== */

//         const previous =
//           lastLocations.get(userId);

//         if (previous) {
//           const distance = getDistance(
//             previous.latitude,
//             previous.longitude,
//             latitude,
//             longitude
//           );

//           if (
//             distance < MIN_DISTANCE &&
//             speed < 1
//           ) {
//             return;
//           }
//         }

//         lastLocationUpdate.set(userId, now);

//         lastLocations.set(userId, {
//           latitude,
//           longitude,
//         });

//         /* ===== CURRENT LOCATION ===== */

//         await db.query(
//           `
//           INSERT INTO user_locations_current
//           (
//             user_id,
//             latitude,
//             longitude,
//             speed,
//             heading,
//             accuracy
//           )
//           VALUES (?, ?, ?, ?, ?, ?)

//           ON DUPLICATE KEY UPDATE
//             latitude = VALUES(latitude),
//             longitude = VALUES(longitude),
//             speed = VALUES(speed),
//             heading = VALUES(heading),
//             accuracy = VALUES(accuracy),
//             updated_at = NOW()
//           `,
//           [
//             userId,
//             latitude,
//             longitude,
//             speed,
//             heading,
//             accuracy,
//           ]
//         );

//         /* ===== HISTORY ===== */

//         const lastHistory =
//           lastHistoryInsert.get(userId) || 0;

//         if (
//           now - lastHistory >
//           HISTORY_INTERVAL
//         ) {
//           await db.query(
//             `
//             INSERT INTO user_locations_history
//             (
//               user_id,
//               latitude,
//               longitude,
//               speed,
//               heading,
//               accuracy
//             )
//             VALUES (?, ?, ?, ?, ?, ?)
//             `,
//             [
//               userId,
//               latitude,
//               longitude,
//               speed,
//               heading,
//               accuracy,
//             ]
//           );

//           lastHistoryInsert.set(userId, now);
//         }

//         /* ===== REALTIME ADMIN UPDATE ===== */

//         io.to("admins").emit(
//           "staffLocationUpdate",
//           {
//             user_id: userId,
//             latitude,
//             longitude,
//             speed,
//             heading,
//             accuracy,
//             timestamp: new Date().toISOString(),
//           }
//         );

//         console.log(
//           `📡 User:${userId} | Lat:${latitude} | Lng:${longitude} | Acc:${accuracy}m`
//         );
//       } catch (err) {
//         console.error(
//           `❌ LOCATION ERROR [${userId}]`,
//           err.message
//         );
//       }
//     });

//     /* ================= DISCONNECT ================= */

//     socket.on("disconnect", async (reason) => {
//       console.log(
//         `🔴 DISCONNECTED -> ${userId} (${reason})`
//       );

//       try {
//         await db.query(
//           `
//           UPDATE users_roles
//           SET
//             is_online = 0,
//             last_seen = NOW()
//           WHERE id = ?
//           `,
//           [userId]
//         );
//       } catch (err) {
//         console.error(err);
//       }

//       lastLocationUpdate.delete(userId);
//       lastHistoryInsert.delete(userId);
//       lastLocations.delete(userId);
//     });
//   });
// };

/* ==================== debug version==================================*/

import db from "../config/db.js";
import jwt from "jsonwebtoken";

const LOCATION_INTERVAL = 5000;
const HISTORY_INTERVAL = 30000;
const MIN_DISTANCE = 50;
const MAX_ACCURACY = 30;

const lastLocationUpdate = new Map();
const lastHistoryInsert = new Map();
const lastLocations = new Map();

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

export const locationSocket = (io) => {
  console.log("🚀 LOCATION SOCKET STARTED");

  // Engine-level socket errors
  io.engine.on("connection_error", (err) => {
    console.error("❌ SOCKET ENGINE ERROR");

    console.error({
      code: err.code,
      message: err.message,
      context: err.context,
    });
  });

  // Auto mark inactive users offline  - Every 1 minute run:
  // No location for 2 minutes → offline.
  setInterval(async () => {
    try {
      const [result] = await db.query(`
        UPDATE user_locations_current
        SET is_online = 0
        WHERE updated_at < NOW() - INTERVAL 2 MINUTE
          AND is_online = 1
      `);

      await db.query(`
      UPDATE users_roles ur
      JOIN user_locations_current ulc
        ON ur.id = ulc.user_id
      SET ur.is_online = 0
      WHERE ulc.updated_at < NOW() - INTERVAL 2 MINUTE
        AND ur.is_online = 1
    `);

      if (result.affectedRows > 0) {
        console.log(
          `📴 ${result.affectedRows} users marked offline (no location updates)`,
        );
      }
    } catch (err) {
      console.error("❌ Offline checker error:", err);
    }
  }, 60000);

  // setInterval(() => {
  //   console.log(`Connected sockets: ${io.engine.clientsCount}`);
  // }, 30000);

  setInterval(() => {
    console.log({
      sockets: io.engine.clientsCount,
      timestamp: new Date().toISOString(),
    });
  }, 30000);

  /* ================= AUTH ================= */

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      console.log("🔐 TOKEN RECEIVED:", token ? "YES" : "NO");

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      socket.user = {
        id: decoded.id,
        role: decoded.role,
      };

      console.log(`✅ AUTH SUCCESS USER:${decoded.id} ROLE:${decoded.role}`);

      next();
    } catch (err) {
      console.error("❌ AUTH FAILED:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  /* ================= CONNECTION ================= */

  io.on("connection", async (socket) => {
    const userId = socket.user.id;
    const role = socket.user.role;

    console.log(
      `🟢 User Connected ${socket.user.id} via ${socket.conn.transport.name}`,
    );
    socket.conn.on("upgrade", () => {
      console.log(`⬆️ Transport upgraded to ${socket.conn.transport.name}`);
    });

    console.log("\n================================");
    console.log("🟢 NEW CONNECTION");
    console.log("USER :", userId);
    console.log("ROLE :", role);
    console.log("SOCKET :", socket.id);
    console.log("================================\n");

    try {
      await db.query(
        `
        UPDATE users_roles
        SET is_online = 1,
            last_seen = NOW()
        WHERE id = ?
        `,
        [userId],
      );

      console.log(`✅ USER ${userId} ONLINE`);
    } catch (err) {
      console.error("❌ ONLINE UPDATE ERROR:", err.message);
    }

    if (role === "ADMIN") {
      socket.join("admins");
      console.log(`👨‍💼 ADMIN JOINED ROOM`);
    } else {
      socket.join(`user_${userId}`);
      console.log(`👤 USER ROOM user_${userId}`);
    }

    /* ================= LOCATION EVENT ================= */

    socket.on("staffLocation", async (data) => {
      const startTime = Date.now();

      try {
        console.log("\n--------------------------------");
        console.log(`📥 LOCATION RECEIVED USER:${userId}`);
        console.log("RAW DATA:", data);

        let {
          latitude,
          longitude,
          speed = 0,
          heading = 0,
          accuracy = null,
        } = data;

        latitude = Number(latitude);
        longitude = Number(longitude);
        speed = Number(speed || 0);
        heading = Number(heading || 0);

        if (accuracy !== null) {
          accuracy = Number(accuracy);
        }

        console.log("PARSED:");
        console.log({
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
        });

        /* VALIDATION */

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          console.log("❌ INVALID GPS");
          return;
        }

        /* ACCURACY */

        if (accuracy !== null && Number.isFinite(accuracy)) {
          console.log(`🎯 GPS ACCURACY = ${accuracy}m`);

          if (accuracy > MAX_ACCURACY) {
            console.log(
              `⚠️ REJECTED ACCURACY (${accuracy}m > ${MAX_ACCURACY}m)`,
            );
            return;
          }
        } else {
          console.log("⚠️ ACCURACY NOT RECEIVED FROM MOBILE");
        }

        const now = Date.now();

        /* THROTTLE */

        const lastUpdate = lastLocationUpdate.get(userId) || 0;

        const diffTime = now - lastUpdate;

        console.log(`⏱ LAST UPDATE ${diffTime}ms`);

        if (diffTime < LOCATION_INTERVAL) {
          console.log("⚠️ THROTTLED");
          return;
        }

        /* DISTANCE */

        const previous = lastLocations.get(userId);

        if (previous) {
          const distance = getDistance(
            previous.latitude,
            previous.longitude,
            latitude,
            longitude,
          );

          console.log(`📏 DISTANCE = ${distance.toFixed(2)}m`);

          if (distance < MIN_DISTANCE) {
            console.log(`⚠️ MOVEMENT < ${MIN_DISTANCE}m`);
            return;
          }
        } else {
          console.log("🆕 FIRST LOCATION");
        }

        lastLocationUpdate.set(userId, now);

        lastLocations.set(userId, {
          latitude,
          longitude,
        });

        /* CURRENT LOCATION */

        console.log("💾 INSERT CURRENT LOCATION");

        console.log([userId, latitude, longitude, speed, heading, accuracy]);

        await db.query(
          `
          INSERT INTO user_locations_current
          (
            user_id,
            latitude,
            longitude,
            speed,
            heading,
            accuracy,
            is_online
          )
          VALUES (?, ?, ?, ?, ?, ?, 1)

          ON DUPLICATE KEY UPDATE
            latitude = VALUES(latitude),
            longitude = VALUES(longitude),
            speed = VALUES(speed),
            heading = VALUES(heading),
            accuracy = VALUES(accuracy),
            is_online = 1,
            updated_at = NOW()
          `,
          [userId, latitude, longitude, speed, heading, accuracy],
        );

        console.log("✅ CURRENT LOCATION SAVED");

        /* HISTORY */

        const lastHistory = lastHistoryInsert.get(userId) || 0;

        const historyDiff = now - lastHistory;

        console.log(`🕒 HISTORY DIFF ${historyDiff}ms`);

        if (historyDiff > HISTORY_INTERVAL) {
          await db.query(
            `
            INSERT INTO user_locations_history
            (
              user_id,
              latitude,
              longitude,
              speed,
              heading,
              accuracy
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [userId, latitude, longitude, speed, heading, accuracy],
          );

          lastHistoryInsert.set(userId, now);

          console.log("📚 HISTORY INSERTED");
        }

        /* ADMIN UPDATE */

        const payload = {
          user_id: userId,
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
          timestamp: new Date().toISOString(),
        };

        io.to("admins").emit("staffLocationUpdate", payload);

        console.log("📤 EMITTED TO ADMINS");

        console.log(
          `📍 USER:${userId}
              LAT:${latitude}
              LNG:${longitude}
              SPEED:${speed}
              HEADING:${heading}
              ACCURACY:${accuracy}
              CURRENT TIME:${new Date().toISOString()}`,
        );

        console.log(`⚡ PROCESS TIME ${Date.now() - startTime}ms`);

        console.log("--------------------------------\n");
      } catch (err) {
        console.error(`❌ LOCATION ERROR USER:${userId}`, err);
      }
    });

    /* ================= DISCONNECT ================= */

    socket.on("disconnect", async (reason) => {
      console.log("\n================================");
      console.log("🔴 DISCONNECTED");
      console.log("USER :", userId);
      console.log("REASON :", reason);
      console.log("================================\n");
      console.log(`🔴 USER:${userId} DISCONNECTED | REASON:${reason}`);
      try {
        await db.query(
          `
          UPDATE users_roles
          SET is_online = 0,
              last_seen = NOW()
          WHERE id = ?
          `,
          [userId],
        );

        await db.query(
          `
          UPDATE user_locations_current
          SET is_online = 0
          WHERE user_id = ?
          `,
          [userId],
        );

        console.log(`✅ USER ${userId} OFFLINE`);
      } catch (err) {
        console.error("❌ OFFLINE UPDATE ERROR:", err.message);
      }

      lastLocationUpdate.delete(userId);
      lastHistoryInsert.delete(userId);
      lastLocations.delete(userId);
    });
  });
};

// Example Scenario

// User is sending locations:

// 12:00:00 Connected
// 12:00:25 Ping
// 12:00:25 Pong
// 12:00:50 Ping
// 12:00:50 Pong

// Everything is normal.

// User Loses Internet
// 12:00:00 Connected
// 12:00:25 Ping
// 12:00:25 Pong

// 12:00:30 Mobile internet OFF

// 12:00:50 Ping
// (no response)

// 12:01:15 Ping
// (no response)

// 12:01:50 Disconnect
// Reason: ping timeout

// Socket.IO automatically closes the connection.

// Why It's Useful

// Without heartbeat settings:

// User closes app
// Network drops
// Server still thinks user is connected

// You may have "ghost" online users.

// With heartbeat:

// Network lost
// ↓
// No pong received
// ↓
// Socket disconnects automatically
// ↓
// User marked offline
// For Your GPS Tracking App

// A common production configuration is:

// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   },
//   transports: ["websocket", "polling"],
//   pingInterval: 25000,
//   pingTimeout: 60000,
// });

// This means:

// Ping every 25 seconds.
// Wait up to 60 seconds for a response.
// If no response, disconnect the user automatically.

// Since you're already using location updates plus an updated_at offline checker, these settings provide an additional safety net for detecting dead connections.
