// middleware/logger.js
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  console.log("📥 REQUEST:", {
    method: req.method,
    url: req.originalUrl,
    fullUrl: fullUrl,
    body: req.body,
    user: req.user?.id || null,
    query: req.query,
  });

  const originalSend = res.send;

  res.send = function (body) {
    const duration = Date.now() - start;

    console.log("📤 RESPONSE:", {
      method: req.method,
      url: req.originalUrl,
      fullUrl: fullUrl,
      status: res.statusCode,
      duration: duration + "ms",
      response: safeJson(body),
    });

    return originalSend.call(this, body);
  };

  next();
};


// export const requestLogger = (req, res, next) => {
//   const start = Date.now();

//   const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

//   console.log("📥 REQUEST:", {
//     method: req.method,
//     url: fullUrl,
//     body: req.body,
//     query: req.query,
//   });

//   const originalSend = res.send;

//   res.send = function (body) {
//     const duration = Date.now() - start;

//     console.log("📤 RESPONSE:", {
//       method: req.method,
//       url: fullUrl,
//       status: res.statusCode,
//       duration: duration + "ms",
//     });

//     return originalSend.call(this, body);
//   };

//   next();
// };

// export const requestLogger = (req, res, next) => {
//   const start = Date.now();

//   const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

//   console.log("📥 REQUEST:", {
//     requestId: req.requestId,
//     method: req.method,
//     url: fullUrl,
//     ip: req.clientIp,
//     userId: req.user?.id || null,
//   });

//   const originalSend = res.send;

//   res.send = function (body) {
//     const duration = Date.now() - start;

//     console.log("📤 RESPONSE:", {
//       requestId: req.requestId,
//       status: res.statusCode,
//       duration: duration + "ms",
//     });

//     return originalSend.call(this, body);
//   };

//   next();
// };

// prevent crash if response is not JSON
const safeJson = (data) => {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};