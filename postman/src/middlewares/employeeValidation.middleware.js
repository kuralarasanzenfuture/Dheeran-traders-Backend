export const validateEmployee = (req, res, next) => {

  const errors = [];

  const allowedFields = [
    "employee_name",
    "email",
    "phone",
    "date_of_birth",
    "gender",
    "address",
    "aadhar_number",
    "pan_number",
    "bank_name",
    "bank_account_number",
    "ifsc_code",
    "emergency_contact_name",
    "emergency_contact_phone",
    "emergency_contact_relation"
  ];

  const requiredFields = ["employee_name", "phone"];

  /* ---------- detect wrong fields ---------- */

  const receivedFields = Object.keys(req.body);

  const invalidFields = receivedFields.filter(
    field => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    errors.push({
      type: "INVALID_FIELD",
      fields: invalidFields,
      message: "Invalid fields sent in request"
    });
  }

  /* ---------- detect missing fields ---------- */

  requiredFields.forEach(field => {
    if (!req.body[field]) {
      errors.push({
        type: "REQUIRED",
        field,
        message: `${field} is required`
      });
    }
  });

  /* ---------- format validation ---------- */

  const { employee_name, phone, email, aadhar_number, pan_number, ifsc_code } = req.body;

  if (employee_name && employee_name.trim().length < 3) {
    errors.push({
      type: "FORMAT",
      field: "employee_name",
      message: "Employee name must be at least 3 characters"
    });
  }

  if (phone && !/^[0-9]{10}$/.test(phone)) {
    errors.push({
      type: "FORMAT",
      field: "phone",
      message: "Phone must be a valid 10 digit number"
    });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({
      type: "FORMAT",
      field: "email",
      message: "Invalid email format"
    });
  }

  if (aadhar_number && !/^[0-9]{12}$/.test(aadhar_number)) {
    errors.push({
      type: "FORMAT",
      field: "aadhar_number",
      message: "Invalid Aadhaar number"
    });
  }

  if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
    errors.push({
      type: "FORMAT",
      field: "pan_number",
      message: "Invalid PAN format"
    });
  }

  if (ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
    errors.push({
      type: "FORMAT",
      field: "ifsc_code",
      message: "Invalid IFSC code"
    });
  }

  /* ---------- return errors ---------- */

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
};