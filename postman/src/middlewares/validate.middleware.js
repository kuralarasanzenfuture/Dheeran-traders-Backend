export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // show all errors
      stripUnknown: true, // 🔥 removes unwanted fields automatically
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((err) => ({
          field: err.path[0],
          message: err.message,
        })),
      });
    }

    req.body = value; // cleaned data
    console.log("middleware", req.body);
    
    next();
  };
};