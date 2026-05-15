// import dotenv from "dotenv";
// dotenv.config();

// import app from "./app.js";
// import { initDatabase } from "./config/initDb.js";

// const PORT = process.env.PORT || 5000;

// const startServer = async () => {
//   await initDatabase();

//   app.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
//   });
// };

// startServer();

import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { initDatabase } from "./config/initDb.js";
import { locationSocket } from "./sockets/location.socket.js";

const PORT = process.env.PORT || 5000;
// ipconfig

import os from "os";

// function getLocalIP() {
//   const interfaces = os.networkInterfaces();

//   for (let name in interfaces) {
//     for (let net of interfaces[name]) {
//       if (net.family === "IPv4" && !net.internal) {
//         return net.address;
//       }
//     }
//   }
//   return "localhost";
// }

function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (let name in interfaces) {
    // 🔥 prioritize WiFi / Ethernet only
    if (!name.toLowerCase().includes("wi-fi") && !name.toLowerCase().includes("ethernet")) continue;

    for (let net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

const startServer = async () => {
  await initDatabase();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // Initialize socket logic
  locationSocket(io);

  // server.listen(PORT, () => {
  //   console.log(`🚀 Server running on http://localhost:${PORT}`);
  // });

  const HOST = "0.0.0.0";

  // server.listen(PORT, HOST, () => {
  //   console.log(`Server running on http://192.168.1.4:${PORT}`);
  // });

  const localIP = getLocalIP();

  server.listen(PORT, HOST, () => {
    console.log(`🚀 Server running`);
    console.log(`Local: http://localhost:${PORT}`);
    // console.log(`Network: http://192.168.1.4:${PORT}`);
    console.log(`Network: http://${localIP}:${PORT}`);
  });
};

startServer();
