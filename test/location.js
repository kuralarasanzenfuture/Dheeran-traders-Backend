import db from "../src/config/db.js";
const users = [
  { user_id: 1, pathIndex: 0 },
  { user_id: 2, pathIndex: 0 },
  { user_id: 3, pathIndex: 0 }
];

const routes = {
  1: [
    { lat: 12.1277, lng: 78.1579 }, // Dharmapuri Old Bus Stand
    { lat: 12.1290, lng: 78.1600 },
    { lat: 12.1305, lng: 78.1625 }  // New Bus Stand
  ],
  2: [
    { lat: 12.9716, lng: 77.5946 }, // Bangalore
    { lat: 12.9725, lng: 77.5960 },
    { lat: 12.9740, lng: 77.5980 }
  ],
  3: [
    { lat: 11.0168, lng: 76.9558 }, // Coimbatore
    { lat: 11.0180, lng: 76.9580 },
    { lat: 11.0200, lng: 76.9600 }
  ]
};
// Smooth interpolation (REAL movement, not jumping)
function interpolate(start, end, steps = 10) {
  const latStep = (end.lat - start.lat) / steps;
  const lngStep = (end.lng - start.lng) / steps;

  const points = [];

  for (let i = 0; i <= steps; i++) {
    points.push({
      lat: start.lat + latStep * i,
      lng: start.lng + lngStep * i
    });
  }

  return points;
}

function buildFullPath(route) {
  let full = [];

  for (let i = 0; i < route.length - 1; i++) {
    full.push(...interpolate(route[i], route[i + 1], 20));
  }

  return full;
}

export const startMultiUserTracking = (io) => {

  const userPaths = {};

  // build paths
  users.forEach(user => {
    userPaths[user.user_id] = {
      points: buildFullPath(routes[user.user_id]),
      index: 0
    };
  });

  setInterval(async () => {

    for (const user of users) {

      const tracker = userPaths[user.user_id];
      const point = tracker.points[tracker.index];

      // 🔥 Emit live update
      io.emit("staffLocationUpdate", {
        user_id: user.user_id,
        latitude: point.lat,
        longitude: point.lng,
        is_online: true
      });

      // 🔥 Update DB (IMPORTANT)
      await db.query(`
        INSERT INTO user_locations_current (user_id, latitude, longitude, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          latitude = VALUES(latitude),
          longitude = VALUES(longitude),
          updated_at = NOW()
      `, [user.user_id, point.lat, point.lng]);

      tracker.index++;

      if (tracker.index >= tracker.points.length) {
        tracker.index = 0; // loop route
      }
    }

  }, 2000); // every 2 sec
};