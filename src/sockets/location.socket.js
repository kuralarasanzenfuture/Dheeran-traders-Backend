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
import db from "../config/db.js";
import jwt from "jsonwebtoken";

const LOCATION_INTERVAL = 5000;
const HISTORY_INTERVAL = 30000;
const ONLINE_THRESHOLD = 10000;

export const locationSocket = (io) => {

  console.log("🚀 Socket.IO initialized");

  // ================= AUTH =================
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.log("❌ AUTH: No token");
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      socket.user = {
        id: decoded.id,
        role: decoded.role,
      };

      console.log(`🔐 AUTH OK → User:${decoded.id} Role:${decoded.role}`);

      next();
    } catch (err) {
      console.log("❌ AUTH FAILED:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  // ================= CONNECTION =================
  io.on("connection", async (socket) => {

    const userId = socket.user.id;
    const role = socket.user.role;

    console.log(`🟢 CONNECT → User:${userId} Role:${role}`);

    // join rooms
    if (role === "ADMIN") {
      socket.join("admins");
    } else {
      socket.join(`user_${userId}`);
    }

    // mark last seen
    await db.query(
      `UPDATE users_roles SET is_online = 1, last_seen = NOW() WHERE id = ?`,
      [userId]
    );

    const lastLocationUpdate = new Map();
    const lastHistoryInsert = new Map();

    // ================= LOCATION =================
    socket.on("staffLocation", async (data) => {

      const startTime = Date.now();

      console.log(`📥 [${userId}] RAW:`, data);

      try {
        let { latitude, longitude } = data;

        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude);

        // ===== VALIDATION =====
        if (
          latitude == null ||
          longitude == null ||
          isNaN(latitude) ||
          isNaN(longitude)
        ) {
          console.log(`⚠️ [${userId}] INVALID GPS`);
          return;
        }

        const now = Date.now();

        // ===== THROTTLE =====
        const lastUpdate = lastLocationUpdate.get(userId) || 0;

        if (now - lastUpdate < LOCATION_INTERVAL) {
          console.log(`⏱️ [${userId}] THROTTLED (${now - lastUpdate}ms)`);
          return;
        }

        lastLocationUpdate.set(userId, now);

        console.log(`✅ [${userId}] VALID LOCATION (${latitude}, ${longitude})`);

        // ===== DB CURRENT =====
        await db.query(
          `INSERT INTO user_locations_current (user_id, latitude, longitude)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             latitude = VALUES(latitude),
             longitude = VALUES(longitude),
             updated_at = CURRENT_TIMESTAMP`,
          [userId, latitude, longitude]
        );

        console.log(`💾 [${userId}] CURRENT UPDATED`);

        // ===== HISTORY =====
        const lastHistory = lastHistoryInsert.get(userId) || 0;

        if (now - lastHistory > HISTORY_INTERVAL) {
          await db.query(
            `INSERT INTO user_locations_history (user_id, latitude, longitude)
             VALUES (?, ?, ?)`,
            [userId, latitude, longitude]
          );

          lastHistoryInsert.set(userId, now);

          console.log(`📚 [${userId}] HISTORY INSERTED`);
        }

        // ===== STATUS CALC =====
        const status = "ONLINE";

        // ===== EMIT =====
        const payload = {
          user_id: userId,
          latitude,
          longitude,
          status,
          timestamp: new Date(),
        };

        io.to("admins").emit("staffLocationUpdate", payload);

        console.log(`📡 [${userId}] EMITTED → ADMINS`);

        // ===== PERF =====
        console.log(`⚡ [${userId}] PROCESS TIME: ${Date.now() - startTime}ms`);

      } catch (error) {
        console.error(`❌ [${userId}] ERROR:`, error.message);
      }
    });

    // ================= DISCONNECT =================
    socket.on("disconnect", async (reason) => {

      console.log(`🔴 DISCONNECT → User:${userId} Reason:${reason}`);

      await db.query(
        `UPDATE users_roles SET is_online = 0, last_seen = NOW() WHERE id = ?`,
        [userId]
      );

    });

  });

  // ================= BACKGROUND STATUS CHECK =================
  setInterval(async () => {
    try {
      const [rows] = await db.query(`
        SELECT user_id, updated_at
        FROM user_locations_current
      `);

      const now = Date.now();

      rows.forEach((row) => {
        const last = new Date(row.updated_at).getTime();
        const diff = now - last;

        let status = "OFFLINE";

        if (diff <= 10000) status = "ONLINE";
        else if (diff <= 60000) status = "IDLE";

        console.log(`📊 STATUS → User:${row.user_id} = ${status}`);
      });

    } catch (err) {
      console.error("❌ STATUS CHECK ERROR:", err.message);
    }
  }, 15000);

};