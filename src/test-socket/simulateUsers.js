import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:5000";

const TOTAL_USERS = 50; // simulate 50 staff

function randomLat() {
  return 10.7900 + Math.random() * 0.01;
}

function randomLng() {
  return 78.7000 + Math.random() * 0.01;
}

for (let i = 1; i <= TOTAL_USERS; i++) {

  const socket = io(SERVER_URL);

  socket.on("connect", () => {

    console.log(`User ${i} connected`);

    setInterval(() => {

      const data = {
        user_id: i,
        latitude: randomLat(),
        longitude: randomLng()
      };

      socket.emit("staffLocation", data);

      console.log(`User ${i} sent location`, data);

    }, 5000); // every 5 seconds

  });

}