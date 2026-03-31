export const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
};


export const globalErrorHandler = (err, req, res, next) => {
  console.error(`[${req.requestId || "NO_ID"}] GLOBAL ERROR`, {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    requestId: req.requestId
  });
};
