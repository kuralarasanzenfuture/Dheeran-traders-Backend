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


import db from "../config/db.js";

export const locationSocket = (io) => {

  console.log("✅ Socket.IO initialized");

  io.on("connection", (socket) => {

    console.log("🟢 Client connected:", socket.id);

    socket.on("staffLocation", async (data) => {
      try {

        const { user_id, latitude, longitude } = data;

        if (!user_id || !latitude || !longitude) return;

        // update current location
        await db.query(
          `INSERT INTO user_locations_current (user_id, latitude, longitude)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
           latitude = VALUES(latitude),
           longitude = VALUES(longitude),
           updated_at = CURRENT_TIMESTAMP`,
          [user_id, latitude, longitude]
        );

        // randomly store history (example: every ~30 seconds)
        if (Math.random() < 0.2) {
          await db.query(
            `INSERT INTO user_locations_history (user_id, latitude, longitude)
             VALUES (?, ?, ?)`,
            [user_id, latitude, longitude]
          );
        }

        io.emit("staffLocationUpdate", data);

      } catch (error) {
        console.error("Socket error:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected:", socket.id);
    });

  });

};

