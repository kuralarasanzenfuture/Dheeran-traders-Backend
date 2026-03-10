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

const startServer = async () => {

  await initDatabase();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: "*"
    }
  });

  // Initialize socket logic
  locationSocket(io);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on ${PORT}`);
  });

};

startServer();