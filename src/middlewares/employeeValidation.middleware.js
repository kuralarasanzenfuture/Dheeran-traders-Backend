export const validateEmployee = (req, res, next) => {

  const {
    employee_name,
    email,
    phone,
    gender,
    aadhar_number,
    pan_number
  } = req.body;

  if (!employee_name || employee_name.trim().length < 3) {
    return res.status(400).json({
      success:false,
      message:"Employee name must be at least 3 characters"
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success:false,
      message:"Invalid email format"
    });
  }

  if (!/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({
      success:false,
      message:"Phone must be 10 digits"
    });
  }

  if (aadhar_number && !/^[0-9]{12}$/.test(aadhar_number)) {
    return res.status(400).json({
      success:false,
      message:"Invalid Aadhaar number"
    });
  }

  if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
    return res.status(400).json({
      success:false,
      message:"Invalid PAN format"
    });
  }

  next();
};