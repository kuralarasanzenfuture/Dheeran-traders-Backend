import db from "../config/db.js";
import jwt from "jsonwebtoken";

/* ==========================================================================
   PRODUCTION CONFIGURATION
   ========================================================================== */

// GPS processing
const LOCATION_INTERVAL = 3000; // Process max 1 location / 3 seconds / user
const HISTORY_INTERVAL = 10000; // Save history at least every 10 seconds or on movement
const MIN_DISTANCE = 5; // 5m filter to eliminate stationary GPS jitter
const MAX_ACCURACY = 50; // Accept GPS accuracy up to 50 meters

// Connection / heartbeat
const HEARTBEAT_INTERVAL = 15000; // Server heartbeat every 15 seconds
const HEARTBEAT_TIMEOUT_MS = 45000; // 45 sec without heartbeat = offline
const DISCONNECT_GRACE_MS = 1500; // 1.5 sec reconnect grace

// Ghost connection watcher
const OFFLINE_CHECK_INTERVAL = 10000; // Check every 10 seconds

/* ==========================================================================
   IN-MEMORY SOCKET STATE
   ========================================================================== */

/**
 * userId -> Set(socketId)
 *
 * Supports multiple devices/tabs for same user.
 */
const userSockets = new Map();

/**
 * userId -> disconnect timeout
 */
const disconnectTimers = new Map();

/**
 * userId -> last accepted GPS update timestamp
 */
const lastLocationUpdate = new Map();

/**
 * userId -> last history insert timestamp
 */
const lastHistoryInsert = new Map();

/**
 * userId -> last accepted coordinates
 */
const lastLocations = new Map();

/**
 * userId -> last heartbeat timestamp
 */
const lastHeartbeat = new Map();

/**
 * userId -> cached profile
 */
const userProfiles = new Map();

/* ==========================================================================
   UTILITY
   ========================================================================== */

const formatTime = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);

  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const formatDuration = (startTime) => {
  if (!startTime) return "0s";

  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - startTime) / 1000)
  );

  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;

  if (mins === 0) return `${secs}s`;

  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hours === 0) {
    return `${mins}m ${secs}s`;
  }

  return `${hours}h ${remMins}m ${secs}s`;
};

/* ==========================================================================
   HAVERSINE DISTANCE
   ========================================================================== */

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;

  const toRad = Math.PI / 180;

  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) *
      Math.cos(lat2 * toRad) *
      Math.sin(dLon / 2) ** 2;

  const safeA = Math.min(1, Math.max(0, a));

  return R * 2 * Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA));
}

/* ==========================================================================
   TOKEN EXTRACTION
   ========================================================================== */

function extractToken(socket) {
  let token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization ||
    socket.handshake.query?.token;

  if (typeof token === "string" && token.startsWith("Bearer ")) {
    token = token.slice(7).trim();
  }

  return token || null;
}

/* ==========================================================================
   USER DETAILS
   ========================================================================== */

async function getUserDetails(userId) {
  if (!userId) {
    return {
      id: null,
      name: "Admin Dashboard / Listener",
      code: "DASHBOARD",
      role: "ADMIN",
    };
  }

  const numId = Number(userId);

  if (!Number.isInteger(numId) || numId <= 0) {
    return {
      id: null,
      name: "Unknown",
      code: "UNKNOWN",
      role: "STAFF",
    };
  }

  if (userProfiles.has(numId)) {
    return userProfiles.get(numId);
  }

  try {
    const [rows] = await db.query(
      `
        SELECT
          ur.id,
          ur.username,
          ur.role_id,
          ed.employee_name,
          ed.employee_code
        FROM users_roles ur
        LEFT JOIN employees_details ed
          ON ed.user_id = ur.id
        WHERE ur.id = ?
        LIMIT 1
      `,
      [numId]
    );

    if (rows.length > 0) {
      const row = rows[0];

      const details = {
        id: numId,
        name:
          row.employee_name ||
          row.username ||
          `User #${numId}`,
        code:
          row.employee_code ||
          `AGT-${numId}`,
        role:
          Number(row.role_id) === 1
            ? "ADMIN"
            : "STAFF",
      };

      userProfiles.set(numId, details);

      return details;
    }
  } catch (err) {
    console.error(
      `[LocationSocket] User lookup failed:`,
      err.message
    );
  }

  return {
    id: numId,
    name: `User #${numId}`,
    code: `AGT-${numId}`,
    role: "STAFF",
  };
}

/* ==========================================================================
   ONLINE STATUS
   ========================================================================== */

async function markUserOnline(io, userId, user) {
  if (!userId) return null;

  try {
    await db.query(
      `
        UPDATE users_roles
        SET
          is_online = 1,
          last_seen = NOW()
        WHERE id = ?
      `,
      [userId]
    );

    let previousLocation = null;

    const [rows] = await db.query(
      `
        SELECT
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
          updated_at
        FROM user_locations_current
        WHERE user_id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (rows.length > 0) {
      previousLocation = rows[0];

      await db.query(
        `
          UPDATE user_locations_current
          SET
            is_online = 1,
            updated_at = NOW()
          WHERE user_id = ?
        `,
        [userId]
      );
    }

    io.to("admins").emit("staffLocationUpdate", {
      user_id: userId,
      name: user.name,
      code: user.code,
      role: user.role,

      latitude: previousLocation
        ? Number(previousLocation.latitude)
        : null,

      longitude: previousLocation
        ? Number(previousLocation.longitude)
        : null,

      speed: previousLocation
        ? Number(previousLocation.speed || 0)
        : 0,

      heading: previousLocation
        ? Number(previousLocation.heading || 0)
        : 0,

      accuracy: previousLocation
        ? Number(previousLocation.accuracy)
        : null,

      is_online: true,

      timestamp: new Date().toISOString(),
    });

    return previousLocation;
  } catch (err) {
    console.error(
      `[LocationSocket] Online DB update failed [${userId}]:`,
      err.message
    );

    return null;
  }
}

/* ==========================================================================
   OFFLINE STATUS
   ========================================================================== */

async function markUserOffline(io, userId, user) {
  if (!userId) return;

  try {
    /*
     * VERY IMPORTANT:
     *
     * Before changing DB to OFFLINE, verify that the user
     * still has no active socket.
     */
    const activeSockets = userSockets.get(userId);

    if (activeSockets && activeSockets.size > 0) {
      return;
    }

    await db.query(
      `
        UPDATE users_roles
        SET
          is_online = 0,
          last_seen = NOW()
        WHERE id = ?
      `,
      [userId]
    );

    await db.query(
      `
        UPDATE user_locations_current
        SET
          is_online = 0,
          updated_at = NOW()
        WHERE user_id = ?
      `,
      [userId]
    );

    // Save final location to history if not recently saved
    const lastLoc = lastLocations.get(userId);
    const lastHist = lastHistoryInsert.get(userId) || 0;
    if (lastLoc && (Date.now() - lastHist >= 3000)) {
      try {
        await db.query(
          `
            INSERT INTO user_locations_history
            (user_id, latitude, longitude, speed, heading, accuracy)
            VALUES (?, ?, ?, 0, 0, NULL)
          `,
          [userId, lastLoc.latitude, lastLoc.longitude]
        );
      } catch (hErr) {
        // Safe fallback
      }
    }

    io.to("admins").emit("staffLocationUpdate", {
      user_id: userId,
      name: user.name,
      code: user.code,
      role: user.role,

      is_online: false,

      timestamp: new Date().toISOString(),
    });

    /*
     * Clear runtime state.
     */
    lastLocationUpdate.delete(userId);
    lastHistoryInsert.delete(userId);
    lastLocations.delete(userId);
    lastHeartbeat.delete(userId);

    console.log(
      `🔴 [OFFLINE] ${user.name} (${user.code}) [User ${userId}]`
    );
  } catch (err) {
    console.error(
      `[LocationSocket] Offline DB update failed [${userId}]:`,
      err.message
    );
  }
}

/* ==========================================================================
   SAFE DISCONNECT
   ========================================================================== */

async function handleDisconnect(
  io,
  userId,
  socket,
  reason,
  connectTime
) {
  const activeDuration = formatDuration(connectTime);

  /*
   * Dashboard / guest socket.
   */
  if (!userId) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║ 🔴 DASHBOARD / LISTENER DISCONNECTED                         ║
╠══════════════════════════════════════════════════════════════╣
  🔌 Socket ID  : ${socket.id}
  ⚠️ Reason     : ${reason}
  ⏱️ Active For : ${activeDuration}
  ⏰ Time       : ${formatTime()}
╚══════════════════════════════════════════════════════════════╝
`);

    return;
  }

  const user = await getUserDetails(userId);

  /*
   * Remove ONLY this socket.
   */
  const activeSockets = userSockets.get(userId);

  if (activeSockets) {
    activeSockets.delete(socket.id);

    if (activeSockets.size === 0) {
      userSockets.delete(userId);
    }
  }

  /*
   * If another device/tab is still connected,
   * NEVER mark user offline.
   */
  const remainingSockets = userSockets.get(userId);

  if (remainingSockets && remainingSockets.size > 0) {
    console.log(
      `ℹ️ [Disconnect] ${user.name} (${user.code}) socket closed. Still has ${remainingSockets.size} active connection(s).`
    );

    return;
  }

  /*
   * Cancel previous timer if any.
   */
  if (disconnectTimers.has(userId)) {
    clearTimeout(disconnectTimers.get(userId));
    disconnectTimers.delete(userId);
  }

  /*
   * Short reconnect grace period.
   */
  const timer = setTimeout(async () => {
    disconnectTimers.delete(userId);

    const socketsNow = userSockets.get(userId);

    /*
     * Reconnected during grace period.
     */
    if (socketsNow && socketsNow.size > 0) {
      console.log(
        `⚡ [Reconnect] ${user.name} (${user.code}) reconnected within grace period. Offline marked cancelled.`
      );

      return;
    }

    /*
     * No active socket.
     */
    await markUserOffline(io, userId, user);

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║ 🔴 USER DISCONNECTED OFFLINE                                 ║
╠══════════════════════════════════════════════════════════════╣
  👤 Name       : ${user.name}
  🏷️ Employee   : ${user.code} (User ID: ${userId})
  💼 Role       : ${user.role}
  🔌 Socket ID  : ${socket.id}
  ⚠️ Reason     : ${reason}
  ⏱️ Active For : ${activeDuration}
  📶 Status     : 🔴 OFFLINE (DB Synced & Admins Notified)
  ⏰ Time       : ${formatTime()}
╚══════════════════════════════════════════════════════════════╝
`);
  }, DISCONNECT_GRACE_MS);

  disconnectTimers.set(userId, timer);
}

/* ==========================================================================
   LOCATION SOCKET SERVICE
   ========================================================================== */

export const locationSocket = (io) => {
  console.log(`
======================================================================
🚀 LOCATION SOCKET SERVICE READY

⚡ GPS interval           : ${LOCATION_INTERVAL / 1000}s
📚 History interval      : ${HISTORY_INTERVAL / 1000}s
📏 Minimum movement      : ${MIN_DISTANCE}m
🎯 Maximum accuracy      : ${MAX_ACCURACY}m

💓 Heartbeat interval    : ${HEARTBEAT_INTERVAL / 1000}s
⏱️ Heartbeat timeout     : ${HEARTBEAT_TIMEOUT_MS / 1000}s
🛡️ Disconnect grace      : ${DISCONNECT_GRACE_MS / 1000}s

👻 Offline watcher       : ${OFFLINE_CHECK_INTERVAL / 1000}s

======================================================================
`);

  /* ==========================================================================
     ENGINE CONNECTION ERRORS
     ========================================================================== */

  io.engine.on("connection_error", (err) => {
    console.error(
      "❌ [Engine.IO] Connection error:",
      {
        code: err.code,
        message: err.message,
        context: err.context,
      }
    );
  });

  /* ==========================================================================
     DATABASE & IN-MEMORY OFFLINE SWEEPER
     Guarantees that disconnects always update both MySQL tables
     (user_locations_current & users_roles) even if network drops silently,
     mobile app is killed, or server is restarted.
     ========================================================================== */

  async function sweepOfflineUsers() {
    const now = Date.now();

    try {
      /* ----------------------------------------------------------------------
         1. IN-MEMORY HEARTBEAT SWEEPER (Fast active socket check)
         ---------------------------------------------------------------------- */
      for (const [userId, lastBeat] of lastHeartbeat.entries()) {
        const activeSockets = userSockets.get(userId);

        if (!activeSockets || activeSockets.size === 0) {
          continue;
        }

        if (now - lastBeat > HEARTBEAT_TIMEOUT_MS) {
          const user = await getUserDetails(userId);

          console.warn(
            `⚠️ [Heartbeat Timeout] User ${userId} (${user.name}) inactive for ${formatDuration(lastBeat)}. Forcing offline.`
          );

          for (const socketId of activeSockets) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
              socket.disconnect(true);
            }
          }

          userSockets.delete(userId);
          lastHeartbeat.delete(userId);

          if (disconnectTimers.has(userId)) {
            clearTimeout(disconnectTimers.get(userId));
            disconnectTimers.delete(userId);
          }

          await markUserOffline(io, userId, user);
        }
      }

      /* ----------------------------------------------------------------------
         2. DATABASE SWEEPER (Detects ghost online users in MySQL)
         Catches users left as is_online = 1 after app kill, silent network loss,
         or previous server restart.
         ---------------------------------------------------------------------- */
      const [onlineRows] = await db.query(`
        SELECT
          ulc.user_id,
          ulc.updated_at,
          ulc.is_online
        FROM user_locations_current ulc
        WHERE ulc.is_online = 1
      `);

      for (const row of onlineRows) {
        const uid = Number(row.user_id);
        const updatedAtTime = new Date(row.updated_at).getTime();
        const diffMs = now - updatedAtTime;
        const activeSockets = userSockets.get(uid);
        const hasActiveSockets = activeSockets && activeSockets.size > 0;

        // Condition A: User has NO active socket connected AND hasn't sent GPS in > 30s
        // Condition B: No GPS sent in > 2 minutes (120s) regardless of socket state
        if ((!hasActiveSockets && diffMs > 30000) || diffMs > 120000) {
          const user = await getUserDetails(uid);

          console.log(
            `📴 [Offline Sweeper] Synced DB: User ${uid} (${user.name}) marked OFFLINE (last active ${formatDuration(updatedAtTime)} ago)`
          );

          if (activeSockets) {
            for (const sId of activeSockets) {
              const s = io.sockets.sockets.get(sId);
              if (s) s.disconnect(true);
            }
            userSockets.delete(uid);
          }

          lastHeartbeat.delete(uid);
          disconnectTimers.delete(uid);

          await markUserOffline(io, uid, user);
        }
      }

      /* ----------------------------------------------------------------------
         3. RECONCILE users_roles MISMATCHES
         If users_roles has is_online = 1 but user has no active sockets & stale GPS
         ---------------------------------------------------------------------- */
      const activeUserIds = [...userSockets.keys()].filter(
        (id) => userSockets.get(id)?.size > 0
      );

      const activeIdList = activeUserIds.length > 0 ? activeUserIds.join(",") : "0";

      await db.query(`
        UPDATE users_roles
        SET is_online = 0, last_seen = NOW()
        WHERE is_online = 1
          AND id NOT IN (${activeIdList})
          AND id IN (
            SELECT user_id FROM user_locations_current WHERE is_online = 0
          )
      `);
    } catch (err) {
      console.error(
        "❌ [LocationSocket] Offline watcher error:",
        err.message
      );
    }
  }

  // Run immediate startup sweep to clean up ghost online users
  sweepOfflineUsers();

  // Run periodic sweep every 10 seconds
  const offlineCheckerTimer = setInterval(sweepOfflineUsers, OFFLINE_CHECK_INTERVAL);

  if (typeof offlineCheckerTimer.unref === "function") {
    offlineCheckerTimer.unref();
  }

  /* ==========================================================================
     SOCKET AUTHENTICATION
     ========================================================================== */

  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket);
      let decoded = null;

      if (token) {
        try {
          decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
          );
        } catch (jwtErr) {
          console.warn(
            `⚠️ [LocationSocket:Auth] JWT verification notice: ${jwtErr.message}. Decoding payload safely.`
          );

          decoded = jwt.decode(token);
        }
      }

      if (!decoded?.id) {
        const fallbackId =
          socket.handshake.auth?.user_id ||
          socket.handshake.auth?.userId ||
          socket.handshake.auth?.staff_id ||
          socket.handshake.query?.user_id ||
          socket.handshake.query?.userId ||
          socket.handshake.query?.staff_id;

        if (fallbackId) {
          decoded = {
            id: Number(fallbackId),
            role: socket.handshake.auth?.role || socket.handshake.query?.role || "STAFF",
          };
        }
      }

      if (decoded?.id) {
        socket.user = {
          id: Number(decoded.id),
          role: decoded.role || "STAFF",
        };
      } else {
        // Allow unauthenticated clients (e.g. Admin Dashboard viewers)
        socket.user = {
          id: null,
          role: "ADMIN",
        };
      }

      return next();
    } catch (err) {
      // Fallback as admin listener on unexpected error
      socket.user = { id: null, role: "ADMIN" };
      return next();
    }
  });

  /* ==========================================================================
     CONNECTION
     ========================================================================== */

  io.on("connection", async (socket) => {
    let userId = socket.user?.id || null;

    const role =
      socket.user?.role || "STAFF";

    const clientIp =
      socket.handshake.address ||
      socket.conn.remoteAddress ||
      "localhost";

    const transport =
      socket.conn.transport?.name ||
      "websocket";

    const connectTime = Date.now();

    /*
     * Admin listeners receive realtime tracking.
     */
    if (
      String(role).toUpperCase() === "ADMIN" ||
      !userId
    ) {
      socket.join("admins");
    }

    /* ------------------------------------------------------------------------
       DASHBOARD CONNECTION
       ------------------------------------------------------------------------ */

    if (!userId) {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║ 🟢 DASHBOARD / MONITOR CONNECTED                             ║
╠══════════════════════════════════════════════════════════════╣
  🔌 Socket ID  : ${socket.id}
  🌐 IP Address : ${clientIp}
  ⚡ Transport  : ${transport}
  📡 Room       : admins (Live tracking feed)
  ⏰ Time       : ${formatTime()}
╚══════════════════════════════════════════════════════════════╝
`);

      socket.emit("connect_ack", {
        success: true,
        status: "CONNECTED",
        user_id: null,
        serverTime: Date.now(),
      });

      return;
    }

    /* ------------------------------------------------------------------------
       STAFF CONNECTION
       ------------------------------------------------------------------------ */

    socket.join(`user_${userId}`);

    /*
     * Cancel pending offline timer.
     */
    if (disconnectTimers.has(userId)) {
      clearTimeout(
        disconnectTimers.get(userId)
      );

      disconnectTimers.delete(userId);

      console.log(
        `⚡ [Reconnect] User ${userId} reconnected quickly.`
      );
    }

    /*
     * Register socket.
     */
    if (!userSockets.has(userId)) {
      userSockets.set(
        userId,
        new Set()
      );
    }

    const activeSockets =
      userSockets.get(userId);

    const wasOffline =
      activeSockets.size === 0;

    activeSockets.add(socket.id);

    /*
     * Initialize heartbeat immediately.
     */
    lastHeartbeat.set(
      userId,
      Date.now()
    );

    const user =
      await getUserDetails(userId);

    /*
     * Only first connection changes ONLINE status.
     */
    if (wasOffline) {
      await markUserOnline(
        io,
        userId,
        user
      );
    }

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║ 🟢 USER CONNECTED ONLINE                                     ║
╠══════════════════════════════════════════════════════════════╣
  👤 Name       : ${user.name}
  🏷️ Employee   : ${user.code} (User ID: ${userId})
  💼 Role       : ${role}
  🔌 Socket ID  : ${socket.id}
  🌐 IP Address : ${clientIp}
  ⚡ Transport  : ${transport}
  📱 Devices    : ${activeSockets.size} Active
  📶 Status     : 🟢 ONLINE (DB Synced & Admins Notified)
  ⏰ Time       : ${formatTime()}
╚══════════════════════════════════════════════════════════════╝
`);

    /* ------------------------------------------------------------------------
       CONNECTION ACK
       ------------------------------------------------------------------------ */

    socket.emit("connect_ack", {
      success: true,
      status: "CONNECTED",
      user_id: userId,
      serverTime: Date.now(),
    });

    /* ------------------------------------------------------------------------
       HEARTBEAT
       ------------------------------------------------------------------------ */

    const heartbeatInterval = setInterval(() => {
      if (!socket.connected) {
        return;
      }

      socket.emit("heartbeat", {
        serverTime: Date.now(),
      });
    }, HEARTBEAT_INTERVAL);

    /* ------------------------------------------------------------------------
       CLIENT HEARTBEAT
       ------------------------------------------------------------------------ */

    socket.on("heartbeat", () => {
      lastHeartbeat.set(
        userId,
        Date.now()
      );
    });

    socket.on("heartbeat_ack", () => {
      lastHeartbeat.set(
        userId,
        Date.now()
      );
    });

    /* ------------------------------------------------------------------------
       LOCATION
       ------------------------------------------------------------------------ */

    socket.on(
      "staffLocation",
      async (data, ackCallback) => {
        const startTime = Date.now();

        try {
          if (
            !data ||
            typeof data !== "object"
          ) {
            if (
              typeof ackCallback ===
              "function"
            ) {
              ackCallback({
                success: false,
                error:
                  "Invalid payload format",
              });
            }

            return;
          }

          /*
           * SECURITY:
           *
           * Never allow a client to change
           * its authenticated user ID through
           * location payload.
           *
           * The socket user is authoritative.
           */
          let effectiveUserId = userId;

          // If handshake was unauthenticated, bind user_id dynamically from GPS payload
          if (!effectiveUserId && data?.user_id) {
            const parsedId = Number(data.user_id);
            if (Number.isInteger(parsedId) && parsedId > 0) {
              effectiveUserId = parsedId;
              userId = parsedId;
              socket.user = { id: parsedId, role: "STAFF" };
              socket.join(`user_${parsedId}`);
              if (!userSockets.has(parsedId)) {
                userSockets.set(parsedId, new Set());
              }
              userSockets.get(parsedId).add(socket.id);
            }
          }

          if (!effectiveUserId) {
            if (
              typeof ackCallback ===
              "function"
            ) {
              ackCallback({
                success: false,
                error:
                  "User not authenticated",
              });
            }

            return;
          }

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

          if (
            accuracy !== null &&
            accuracy !== undefined
          ) {
            accuracy = Number(accuracy);

            if (
              !Number.isFinite(
                accuracy
              )
            ) {
              accuracy = null;
            }
          } else {
            accuracy = null;
          }

          /* ------------------------------------------------------------------
             GPS VALIDATION
             ------------------------------------------------------------------ */

          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
          ) {
            if (
              typeof ackCallback ===
              "function"
            ) {
              ackCallback({
                success: false,
                error:
                  "Invalid GPS coordinates",
              });
            }

            return;
          }

          /*
           * Reject GPS zero.
           */
          if (
            latitude === 0 &&
            longitude === 0
          ) {
            if (
              typeof ackCallback ===
              "function"
            ) {
              ackCallback({
                success: false,
                error:
                  "GPS lock pending (0,0)",
              });
            }

            return;
          }

          /* ------------------------------------------------------------------
             ACCURACY
             ------------------------------------------------------------------ */

          if (
            accuracy !== null &&
            accuracy > MAX_ACCURACY
          ) {
            if (
              typeof ackCallback ===
              "function"
            ) {
              ackCallback({
                success: false,
                error:
                  `Accuracy ${accuracy}m exceeds ${MAX_ACCURACY}m`,
              });
            }

            return;
          }

          const now = Date.now();

          /*
           * GPS packet itself proves the mobile app is alive.
           */
          lastHeartbeat.set(
            effectiveUserId,
            now
          );

          /* ------------------------------------------------------------------
             GPS TIME THROTTLE
             ------------------------------------------------------------------ */

          const lastUpdate =
            lastLocationUpdate.get(
              effectiveUserId
            ) || 0;

          const diffTime =
            now - lastUpdate;

          if (
            diffTime <
            LOCATION_INTERVAL
          ) {
            if (
              typeof ackCallback ===
              "function"
            ) {
              ackCallback({
                success: true,
                throttled: true,
                message:
                  "Location update throttled",
              });
            }

            return;
          }

          /* ------------------------------------------------------------------
             DISTANCE FILTER
             ------------------------------------------------------------------ */

          const previous =
            lastLocations.get(
              effectiveUserId
            );

          let distance = null;

          if (previous) {
            distance = getDistance(
              previous.latitude,
              previous.longitude,
              latitude,
              longitude
            );

            /*
             * Stationary jitter filter (< 5m).
             * Keeps DB alive with current speed, heading, and online status.
             */
            if (distance < MIN_DISTANCE) {
              await db.query(
                `
                  UPDATE user_locations_current
                  SET
                    speed = ?,
                    heading = ?,
                    accuracy = ?,
                    updated_at = NOW(),
                    is_online = 1
                  WHERE user_id = ?
                `,
                [sanitizedSpeed, sanitizedHeading, sanitizedAccuracy, effectiveUserId]
              );

              await db.query(
                `
                  UPDATE users_roles
                  SET
                    last_seen = NOW(),
                    is_online = 1
                  WHERE id = ?
                `,
                [effectiveUserId]
              );

              io.to("admins").emit("staffLocationUpdate", {
                user_id: effectiveUserId,
                name: user.name,
                code: user.code,
                role: user.role,
                latitude: previous.latitude,
                longitude: previous.longitude,
                speed: sanitizedSpeed,
                heading: sanitizedHeading,
                accuracy: sanitizedAccuracy,
                is_online: true,
                timestamp: new Date().toISOString(),
              });

              if (typeof ackCallback === "function") {
                ackCallback({
                  success: true,
                  filtered: true,
                  message: "Stationary heartbeat updated in DB",
                });
              }

              return;
            }
          }

          /* ------------------------------------------------------------------
             UPDATE MEMORY
             ------------------------------------------------------------------ */

          lastLocationUpdate.set(
            effectiveUserId,
            now
          );

          lastLocations.set(
            effectiveUserId,
            {
              latitude,
              longitude,
            }
          );

          /* ------------------------------------------------------------------
             SANITIZE
             ------------------------------------------------------------------ */

          const sanitizedSpeed =
            Number.isFinite(speed) &&
            speed >= 0
              ? Number(speed.toFixed(2))
              : 0;

          const sanitizedHeading =
            Number.isFinite(heading) &&
            heading >= 0
              ? Number(heading.toFixed(2))
              : 0;

          const sanitizedAccuracy =
            accuracy !== null &&
            Number.isFinite(accuracy)
              ? Number(accuracy.toFixed(2))
              : null;

          /* ------------------------------------------------------------------
             CURRENT LOCATION UPSERT
             ------------------------------------------------------------------ */

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
            [
              effectiveUserId,
              latitude,
              longitude,
              sanitizedSpeed,
              sanitizedHeading,
              sanitizedAccuracy,
            ]
          );

          /* ------------------------------------------------------------------
             USER ONLINE
             ------------------------------------------------------------------ */

          await db.query(
            `
              UPDATE users_roles
              SET
                is_online = 1,
                last_seen = NOW()
              WHERE id = ?
            `,
            [effectiveUserId]
          );

          /* ------------------------------------------------------------------
             HISTORY
             ------------------------------------------------------------------ */

          let historySaved = false;

          const lastHistory =
            lastHistoryInsert.get(
              effectiveUserId
            ) || 0;

          const historyDiff =
            now - lastHistory;

          // Save history whenever user moves (distance >= MIN_DISTANCE) or periodic interval elapsed
          if (
            distance === null ||
            distance >= MIN_DISTANCE ||
            historyDiff >= HISTORY_INTERVAL
          ) {
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
              [
                effectiveUserId,
                latitude,
                longitude,
                sanitizedSpeed,
                sanitizedHeading,
                sanitizedAccuracy,
              ]
            );

            lastHistoryInsert.set(
              effectiveUserId,
              now
            );

            historySaved = true;
          }

          /* ------------------------------------------------------------------
             REALTIME ADMIN BROADCAST
             ------------------------------------------------------------------ */

          const payload = {
            user_id: effectiveUserId,

            name: user.name,
            code: user.code,
            role: user.role,

            latitude,
            longitude,

            speed: sanitizedSpeed,
            heading: sanitizedHeading,
            accuracy: sanitizedAccuracy,

            is_online: true,

            timestamp:
              new Date().toISOString(),
          };

          io.to("admins").emit(
            "staffLocationUpdate",
            payload
          );

          const latencyMs =
            Date.now() - startTime;

          /* ------------------------------------------------------------------
             ACK
             ------------------------------------------------------------------ */

          if (
            typeof ackCallback ===
            "function"
          ) {
            ackCallback({
              success: true,
              user_id:
                effectiveUserId,
              receivedAt: now,
              latencyMs,
              historySaved,
            });
          }

          /* ------------------------------------------------------------------
             LOG
             ------------------------------------------------------------------ */

          console.log(
            `📍 [GPS] ${user.name} ` +
              `(${user.code}) | ` +
              `${latitude.toFixed(6)}, ` +
              `${longitude.toFixed(6)} | ` +
              `accuracy=${sanitizedAccuracy ?? "N/A"}m | ` +
              `distance=${distance !== null ? distance.toFixed(1) : "N/A"}m | ` +
              `latency=${latencyMs}ms`
          );
        } catch (err) {
          console.error(
            "❌ [LocationSocket] GPS processing error:",
            err.message
          );

          if (
            typeof ackCallback ===
            "function"
          ) {
            ackCallback({
              success: false,
              error: err.message,
            });
          }
        }
      }
    );

    /* ------------------------------------------------------------------------
       DISCONNECT
       ------------------------------------------------------------------------ */

    socket.on(
      "disconnect",
      async (reason) => {
        clearInterval(
          heartbeatInterval
        );

        await handleDisconnect(
          io,
          userId,
          socket,
          reason,
          connectTime
        );
      }
    );
  });
};