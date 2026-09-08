export const validateAgentStaff = (req, res, next) => {
  let { name, phone, reference_mode, status } = req.body;

  if (!name || !phone || !reference_mode) {
    return res.status(400).json({
      message: "Name, phone and reference mode are required",
    });
  }

  reference_mode = reference_mode.toUpperCase();

  const allowedModes = ["AGENT", "STAFF"];
  if (!allowedModes.includes(reference_mode)) {
    return res.status(400).json({
      message: "Reference mode must be AGENT or STAFF",
    });
  }

  const allowedStatus = ["active", "inactive"];
  if (status && !allowedStatus.includes(status)) {
    return res.status(400).json({
      message: "Invalid status",
    });
  }

  req.body.reference_mode = reference_mode;

  next();
};