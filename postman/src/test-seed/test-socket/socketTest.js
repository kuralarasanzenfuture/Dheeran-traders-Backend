import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit("staffLocation", {
    staff_id: 1,
    latitude: 10.7905,
    longitude: 78.7047
  });
});

socket.on("staffLocationUpdate", (data) => {
  console.log("Update received:", data);
});