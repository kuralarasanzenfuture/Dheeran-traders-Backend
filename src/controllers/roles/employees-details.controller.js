import db from "../../config/db.js";
import fs from "fs";
import path from "path";

const deleteFiles = (files) => {
  if (!files) return;

  Object.values(files).forEach((fileArray) => {
    fileArray.forEach((file) => {
      const filePath = file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });
};

const generateEmployeeCode = async () => {
  const [rows] = await db.query(
    "SELECT employee_code FROM employees_details ORDER BY id DESC LIMIT 1",
  );

  if (!rows.length) return "DTT-EMP-001";

  const lastCode = rows[0].employee_code; // DTT-EMP-001
  const lastNumber = parseInt(lastCode.split("-")[2], 10);
  const nextNumber = String(lastNumber + 1).padStart(3, "0");

  return `DTT-EMP-${nextNumber}`;
};

const checkDuplicateEmployee = async ({
  email,
  phone,
  aadhar_number,
  pan_number,
}) => {
  if (email) {
    const [rows] = await db.query(
      "SELECT id FROM employees_details WHERE email=?",
      [email],
    );

    if (rows.length) {
      return "Email already exists";
    }
  }

  if (phone) {
    const [rows] = await db.query(
      "SELECT id FROM employees_details WHERE phone=?",
      [phone],
    );

    if (rows.length) {
      return "Phone number already exists";
    }
  }

  if (aadhar_number) {
    const [rows] = await db.query(
      "SELECT id FROM employees_details WHERE aadhar_number=?",
      [aadhar_number],
    );

    if (rows.length) {
      return "Aadhaar number already exists";
    }
  }

  if (pan_number) {
    const [rows] = await db.query(
      "SELECT id FROM employees_details WHERE pan_number=?",
      [pan_number],
    );

    if (rows.length) {
      return "PAN number already exists";
    }
  }

  return null;
};

// export const createEmployee = async (req, res) => {
//   try {

//     const {
//       employee_code,
//       employee_name,
//       email,
//       phone,
//       date_of_birth,
//       gender,
//       address,
//       aadhar_number,
//       pan_number,
//       bank_name,
//       bank_account_number,
//       ifsc_code,
//       emergency_contact_name,
//       emergency_contact_phone,
//       emergency_contact_relation,
//     } = req.body;

//     const pan_card_image = req.files?.pan_card_image?.[0]?.filename || null;
//     const aadhar_front_image = req.files?.aadhar_front_image?.[0]?.filename || null;
//     const aadhar_back_image = req.files?.aadhar_back_image?.[0]?.filename || null;
//     const bank_passbook_image = req.files?.bank_passbook_image?.[0]?.filename || null;
//     const marksheet_10_image = req.files?.marksheet_10_image?.[0]?.filename || null;
//     const marksheet_12_image = req.files?.marksheet_12_image?.[0]?.filename || null;
//     const college_marksheet_image = req.files?.college_marksheet_image?.[0]?.filename || null;

//     const [result] = await db.query(
//       `INSERT INTO employees_details (
//         employee_code,
//         employee_name,
//         email,
//         phone,
//         date_of_birth,
//         gender,
//         address,
//         aadhar_number,
//         pan_number,
//         bank_name,
//         bank_account_number,
//         ifsc_code,
//         pan_card_image,
//         aadhar_front_image,
//         aadhar_back_image,
//         bank_passbook_image,
//         marksheet_10_image,
//         marksheet_12_image,
//         college_marksheet_image,
//         emergency_contact_name,
//         emergency_contact_phone,
//         emergency_contact_relation
//       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
//       [
//         employee_code,
//         employee_name,
//         email,
//         phone,
//         date_of_birth,
//         gender,
//         address,
//         aadhar_number,
//         pan_number,
//         bank_name,
//         bank_account_number,
//         ifsc_code,
//         pan_card_image,
//         aadhar_front_image,
//         aadhar_back_image,
//         bank_passbook_image,
//         marksheet_10_image,
//         marksheet_12_image,
//         college_marksheet_image,
//         emergency_contact_name,
//         emergency_contact_phone,
//         emergency_contact_relation,
//       ]
//     );

//     res.status(201).json({
//       success: true,
//       message: "Employee created successfully",
//       id: result.insertId,
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });
//   }
// };

// export const createEmployee = async (req, res) => {
//   try {
//     let employee_code = await generateEmployeeCode();

//     let {
//       employee_name,
//       email,
//       phone,
//       date_of_birth,
//       gender,
//       address,
//       aadhar_number,
//       pan_number,
//       bank_name,
//       bank_account_number,
//       ifsc_code,
//       emergency_contact_name,
//       emergency_contact_phone,
//       emergency_contact_relation,
//     } = req.body;

//     // employee_name = employee_name.trim();
//     email = email.trim().toLowerCase();
//     phone = phone.trim();
//     date_of_birth = date_of_birth.trim();
//     address = address.trim();
//     aadhar_number = aadhar_number.trim();

//     pan_number = pan_number.trim().toUpperCase();
//     ifsc_code = ifsc_code.trim().toUpperCase();
//     bank_name = bank_name.trim();
//     gender = gender.trim().toUpperCase();
//     emergency_contact_relation = emergency_contact_relation
//       .trim()
//       .toUpperCase();

//     if (!employee_name || employee_name.trim().length < 3) {
//       return res.status(400).json({
//         success: false,
//         message: "Employee name must be at least 3 characters",
//       });
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//     if (!emailRegex.test(email)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid email format",
//       });
//     }

//     if (!/^[0-9]{10}$/.test(phone)) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone must be 10 digits",
//       });
//     }

//     if (aadhar_number && !/^[0-9]{12}$/.test(aadhar_number)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Aadhaar number",
//       });
//     }

//     if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid PAN format",
//       });
//     }

//     const duplicateError = await checkDuplicateEmployee({
//       email,
//       phone,
//       aadhar_number,
//       pan_number,
//     });

//     if (duplicateError) {
//       deleteFiles(req.files);

//       return res.status(400).json({
//         success: false,
//         message: duplicateError,
//       });
//     }

//     const pan_card_image = req.files?.pan_card_image?.[0]?.filename || null;
//     const aadhar_front_image =
//       req.files?.aadhar_front_image?.[0]?.filename || null;
//     const aadhar_back_image =
//       req.files?.aadhar_back_image?.[0]?.filename || null;
//     const bank_passbook_image =
//       req.files?.bank_passbook_image?.[0]?.filename || null;
//     const marksheet_10_image =
//       req.files?.marksheet_10_image?.[0]?.filename || null;
//     const marksheet_12_image =
//       req.files?.marksheet_12_image?.[0]?.filename || null;
//     const college_marksheet_image =
//       req.files?.college_marksheet_image?.[0]?.filename || null;

//     const [result] = await db.query(
//       `INSERT INTO employees_details (
//         employee_code,
//         employee_name,
//         email,
//         phone,
//         date_of_birth,
//         gender,
//         address,
//         aadhar_number,
//         pan_number,
//         bank_name,
//         bank_account_number,
//         ifsc_code,
//         pan_card_image,
//         aadhar_front_image,
//         aadhar_back_image,
//         bank_passbook_image,
//         marksheet_10_image,
//         marksheet_12_image,
//         college_marksheet_image,
//         emergency_contact_name,
//         emergency_contact_phone,
//         emergency_contact_relation
//       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
//       [
//         employee_code,
//         employee_name,
//         email,
//         phone,
//         date_of_birth,
//         gender,
//         address,
//         aadhar_number,
//         pan_number,
//         bank_name,
//         bank_account_number,
//         ifsc_code,
//         pan_card_image,
//         aadhar_front_image,
//         aadhar_back_image,
//         bank_passbook_image,
//         marksheet_10_image,
//         marksheet_12_image,
//         college_marksheet_image,
//         emergency_contact_name,
//         emergency_contact_phone,
//         emergency_contact_relation,
//       ],
//     );

//     const [rows] = await db.query(
//       "SELECT * FROM employees_details WHERE id=?",
//       [result.insertId],
//     );

//     res.status(201).json({
//       success: true,
//       message: "Employee created successfully",
//       employee_code,
//       id: result.insertId,
//       data: rows[0],
//     });
//   } catch (error) {
//     deleteFiles(req.files);

//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });
//   }
// };

// update same email send again
const checkDuplicateEmployeeupdate = async ({
  email,
  phone,
  aadhar_number,
  pan_number,
  excludeId = null,
}) => {
  if (email) {
    const [rows] = await db.query(
      `SELECT id FROM employees_details 
       WHERE email=? AND id != ?`,
      [email, excludeId],
    );

    if (rows.length) return "Email already exists";
  }

  if (phone) {
    const [rows] = await db.query(
      `SELECT id FROM employees_details 
       WHERE phone=? AND id != ?`,
      [phone, excludeId],
    );

    if (rows.length) return "Phone number already exists";
  }

  if (aadhar_number) {
    const [rows] = await db.query(
      `SELECT id FROM employees_details 
       WHERE aadhar_number=? AND id != ?`,
      [aadhar_number, excludeId],
    );

    if (rows.length) return "Aadhaar number already exists";
  }

  if (pan_number) {
    const [rows] = await db.query(
      `SELECT id FROM employees_details 
       WHERE pan_number=? AND id != ?`,
      [pan_number, excludeId],
    );

    if (rows.length) return "PAN number already exists";
  }

  return null;
};

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
  "emergency_contact_relation",
];

export const createEmployee = async (req, res) => {
  try {
    const employee_code = await generateEmployeeCode();

    let {
      employee_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      aadhar_number,
      pan_number,
      bank_name,
      bank_account_number,
      ifsc_code,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
    } = req.body;

    const receivedFields = Object.keys(req.body);

    const invalidFields = receivedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid fields sent in request",
        invalid_fields: invalidFields,
      });
    }

    if (!req.body.employee_name) {
      return res.status(400).json({
        success: false,
        message: "employee_name is required",
      });
    }

    if (!req.body.phone) {
      return res.status(400).json({
        success: false,
        message: "phone is required",
      });
    }

    /* ---------------- REQUIRED VALIDATION ---------------- */

    // if (!employee_name || employee_name.trim().length < 3) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Employee name must be at least 3 characters",
    //   });
    // }

    // if (!phone || !/^[0-9]{10}$/.test(phone.trim())) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Phone must be a valid 10 digit number and required",
    //   });
    // }

    if (employee_name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Employee name must be at least 3 characters",
      });
    }

    if (!/^[0-9]{10}$/.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Phone must be a valid 10 digit number",
      });
    }

    /* ---------------- SANITIZE DATA ---------------- */

    employee_name = employee_name.trim();
    phone = phone.trim();

    email = email?.trim().toLowerCase() || null;
    date_of_birth = date_of_birth?.trim() || null;
    gender = gender?.trim().toLowerCase() || null;
    address = address?.trim() || null;

    aadhar_number = aadhar_number?.trim() || null;
    pan_number = pan_number?.trim().toUpperCase() || null;

    bank_name = bank_name?.trim() || null;
    bank_account_number = bank_account_number?.trim() || null;
    ifsc_code = ifsc_code?.trim().toUpperCase() || null;

    emergency_contact_name = emergency_contact_name?.trim() || null;
    emergency_contact_phone = emergency_contact_phone?.trim() || null;
    emergency_contact_relation = emergency_contact_relation?.trim() || null;

    /* ---------------- OPTIONAL VALIDATION ---------------- */

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (aadhar_number && !/^[0-9]{12}$/.test(aadhar_number)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Aadhaar number",
      });
    }

    if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAN format",
      });
    }

    if (ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IFSC code",
      });
    }

    /* ---------------- DUPLICATE CHECK ---------------- */

    const duplicateError = await checkDuplicateEmployee({
      email,
      phone,
      aadhar_number,
      pan_number,
    });

    if (duplicateError) {
      deleteFiles(req.files);

      return res.status(400).json({
        success: false,
        message: duplicateError,
      });
    }

    /* ---------------- FILES ---------------- */

    const pan_card_image = req.files?.pan_card_image?.[0]?.filename || null;
    const aadhar_front_image =
      req.files?.aadhar_front_image?.[0]?.filename || null;
    const aadhar_back_image =
      req.files?.aadhar_back_image?.[0]?.filename || null;
    const bank_passbook_image =
      req.files?.bank_passbook_image?.[0]?.filename || null;
    const marksheet_10_image =
      req.files?.marksheet_10_image?.[0]?.filename || null;
    const marksheet_12_image =
      req.files?.marksheet_12_image?.[0]?.filename || null;
    const college_marksheet_image =
      req.files?.college_marksheet_image?.[0]?.filename || null;

    /* ---------------- INSERT ---------------- */

    const [result] = await db.query(
      `INSERT INTO employees_details (
        employee_code,
        employee_name,
        email,
        phone,
        date_of_birth,
        gender,
        address,
        aadhar_number,
        pan_number,
        bank_name,
        bank_account_number,
        ifsc_code,
        pan_card_image,
        aadhar_front_image,
        aadhar_back_image,
        bank_passbook_image,
        marksheet_10_image,
        marksheet_12_image,
        college_marksheet_image,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relation
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        employee_code,
        employee_name,
        email,
        phone,
        date_of_birth,
        gender,
        address,
        aadhar_number,
        pan_number,
        bank_name,
        bank_account_number,
        ifsc_code,
        pan_card_image,
        aadhar_front_image,
        aadhar_back_image,
        bank_passbook_image,
        marksheet_10_image,
        marksheet_12_image,
        college_marksheet_image,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relation,
      ],
    );

    const [rows] = await db.query(
      "SELECT * FROM employees_details WHERE id=?",
      [result.insertId],
    );

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee_code,
      data: rows[0],
    });
  } catch (error) {
    deleteFiles(req.files);

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM employees_details ORDER BY id DESC",
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM employees_details WHERE id=?",
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// export const updateEmployee = async (req, res) => {
//   try {
//     const { id } = req.params;

//     let {
//       employee_name,
//       email,
//       phone,
//       date_of_birth,
//       gender,
//       address,
//       aadhar_number,
//       pan_number,
//       bank_name,
//       bank_account_number,
//       ifsc_code,
//       emergency_contact_name,
//       emergency_contact_phone,
//       emergency_contact_relation,
//     } = req.body;

//     // employee_name = employee_name.trim();
//     email = email.trim().toLowerCase();
//     phone = phone.trim();
//     date_of_birth = date_of_birth.trim();
//     address = address.trim();
//     aadhar_number = aadhar_number.trim();

//     pan_number = pan_number.trim().toUpperCase();
//     ifsc_code = ifsc_code.trim().toUpperCase();
//     bank_name = bank_name.trim();
//     gender = gender.trim().toUpperCase();
//     emergency_contact_relation = emergency_contact_relation
//       .trim()
//       .toUpperCase();

//     if (!employee_name || employee_name.trim().length < 3) {
//       return res.status(400).json({
//         success: false,
//         message: "Employee name must be at least 3 characters",
//       });
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//     if (!emailRegex.test(email)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid email format",
//       });
//     }

//     if (!/^[0-9]{10}$/.test(phone)) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone must be 10 digits",
//       });
//     }

//     if (aadhar_number && !/^[0-9]{12}$/.test(aadhar_number)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Aadhaar number",
//       });
//     }

//     if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid PAN format",
//       });
//     }

//     const duplicateError = await checkDuplicateEmployee({
//       email,
//       phone,
//       aadhar_number,
//       pan_number,
//     });

//     if (duplicateError) {
//       deleteFiles(req.files);

//       return res.status(400).json({
//         success: false,
//         message: duplicateError,
//       });
//     }

//     const [existing] = await db.query(
//       "SELECT * FROM employees_details WHERE id=?",
//       [id],
//     );

//     if (!existing.length) {
//       return res.status(404).json({
//         success: false,
//         message: "Employee not found",
//       });
//     }

//     const emp = existing[0];

//     const pan_card_image =
//       req.files?.pan_card_image?.[0]?.filename || emp.pan_card_image;

//     const aadhar_front_image =
//       req.files?.aadhar_front_image?.[0]?.filename || emp.aadhar_front_image;

//     const aadhar_back_image =
//       req.files?.aadhar_back_image?.[0]?.filename || emp.aadhar_back_image;

//     const bank_passbook_image =
//       req.files?.bank_passbook_image?.[0]?.filename || emp.bank_passbook_image;

//     const marksheet_10_image =
//       req.files?.marksheet_10_image?.[0]?.filename || emp.marksheet_10_image;

//     const marksheet_12_image =
//       req.files?.marksheet_12_image?.[0]?.filename || emp.marksheet_12_image;

//     const college_marksheet_image =
//       req.files?.college_marksheet_image?.[0]?.filename ||
//       emp.college_marksheet_image;

//     await db.query(
//       `UPDATE employees_details
//       SET
//       employee_name=?,
//       email=?,
//       phone=?,
//       date_of_birth=?,
//       gender=?,
//       address=?,
//       aadhar_number=?,
//       pan_number=?,
//       bank_name=?,
//       bank_account_number=?,
//       ifsc_code=?,
//       pan_card_image=?,
//       aadhar_front_image=?,
//       aadhar_back_image=?,
//       bank_passbook_image=?,
//       marksheet_10_image=?,
//       marksheet_12_image=?,
//       college_marksheet_image=?,
//       emergency_contact_name=?,
//       emergency_contact_phone=?,
//       emergency_contact_relation=?
//       WHERE id=?`,
//       [
//         employee_name,
//         email,
//         phone,
//         date_of_birth,
//         gender,
//         address,
//         aadhar_number,
//         pan_number,
//         bank_name,
//         bank_account_number,
//         ifsc_code,
//         pan_card_image,
//         aadhar_front_image,
//         aadhar_back_image,
//         bank_passbook_image,
//         marksheet_10_image,
//         marksheet_12_image,
//         college_marksheet_image,
//         emergency_contact_name,
//         emergency_contact_phone,
//         emergency_contact_relation,
//         id,
//       ],
//     );

//     res.json({
//       success: true,
//       message: "Employee updated successfully",
//     });
//   } catch (error) {
//     deleteFiles(req.files);

//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

// put employee
// export const updateEmployee = async (req, res) => {
//   try {

//     const { id } = req.params;

//     let {
//       employee_name,
//       email,
//       phone,
//       date_of_birth,
//       gender,
//       address,
//       aadhar_number,
//       pan_number,
//       bank_name,
//       bank_account_number,
//       ifsc_code,
//       emergency_contact_name,
//       emergency_contact_phone,
//       emergency_contact_relation,
//     } = req.body;

//     /* ---------------- REQUIRED VALIDATION ---------------- */

//     if (!employee_name || employee_name.trim().length < 3) {
//       return res.status(400).json({
//         success:false,
//         message:"Employee name must be at least 3 characters"
//       });
//     }

//     if (!phone || !/^[0-9]{10}$/.test(phone.trim())) {
//       return res.status(400).json({
//         success:false,
//         message:"Phone must be 10 digits"
//       });
//     }

//     /* ---------------- SANITIZE DATA ---------------- */

//     employee_name = employee_name.trim();
//     phone = phone.trim();

//     email = email?.trim().toLowerCase() || null;
//     date_of_birth = date_of_birth?.trim() || null;
//     gender = gender?.trim().toLowerCase() || null;
//     address = address?.trim() || null;

//     aadhar_number = aadhar_number?.trim() || null;
//     pan_number = pan_number?.trim().toUpperCase() || null;

//     bank_name = bank_name?.trim() || null;
//     bank_account_number = bank_account_number?.trim() || null;
//     ifsc_code = ifsc_code?.trim().toUpperCase() || null;

//     emergency_contact_name = emergency_contact_name?.trim() || null;
//     emergency_contact_phone = emergency_contact_phone?.trim() || null;
//     emergency_contact_relation = emergency_contact_relation?.trim() || null;

//     /* ---------------- OPTIONAL VALIDATION ---------------- */

//     if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       return res.status(400).json({
//         success:false,
//         message:"Invalid email format"
//       });
//     }

//     if (aadhar_number && !/^[0-9]{12}$/.test(aadhar_number)) {
//       return res.status(400).json({
//         success:false,
//         message:"Invalid Aadhaar number"
//       });
//     }

//     if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
//       return res.status(400).json({
//         success:false,
//         message:"Invalid PAN format"
//       });
//     }

//     if (ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
//       return res.status(400).json({
//         success:false,
//         message:"Invalid IFSC code"
//       });
//     }

//     /* ---------------- CHECK EXISTING EMPLOYEE ---------------- */

//     const [existing] = await db.query(
//       "SELECT * FROM employees_details WHERE id=?",
//       [id]
//     );

//     if (!existing.length) {
//       return res.status(404).json({
//         success:false,
//         message:"Employee not found"
//       });
//     }

//     const emp = existing[0];

//     /* ---------------- DUPLICATE CHECK ---------------- */

//     const duplicateError = await checkDuplicateEmployee({
//       email,
//       phone,
//       aadhar_number,
//       pan_number,
//       excludeId:id
//     });

//     if (duplicateError) {

//       deleteFiles(req.files);

//       return res.status(400).json({
//         success:false,
//         message:duplicateError
//       });

//     }

//     /* ---------------- FILE HANDLING ---------------- */

//     const pan_card_image =
//       req.files?.pan_card_image?.[0]?.filename || emp.pan_card_image;

//     const aadhar_front_image =
//       req.files?.aadhar_front_image?.[0]?.filename || emp.aadhar_front_image;

//     const aadhar_back_image =
//       req.files?.aadhar_back_image?.[0]?.filename || emp.aadhar_back_image;

//     const bank_passbook_image =
//       req.files?.bank_passbook_image?.[0]?.filename || emp.bank_passbook_image;

//     const marksheet_10_image =
//       req.files?.marksheet_10_image?.[0]?.filename || emp.marksheet_10_image;

//     const marksheet_12_image =
//       req.files?.marksheet_12_image?.[0]?.filename || emp.marksheet_12_image;

//     const college_marksheet_image =
//       req.files?.college_marksheet_image?.[0]?.filename || emp.college_marksheet_image;

//     // old data

//     const [oldData] = await db.query(
//       "SELECT * FROM employees_details WHERE id=?",
//       [id]
//     )

//     /* ---------------- UPDATE ---------------- */

//     const [updated] = await db.query(
//       `UPDATE employees_details
//       SET
//       employee_name=?,
//       email=?,
//       phone=?,
//       date_of_birth=?,
//       gender=?,
//       address=?,
//       aadhar_number=?,
//       pan_number=?,
//       bank_name=?,
//       bank_account_number=?,
//       ifsc_code=?,
//       pan_card_image=?,
//       aadhar_front_image=?,
//       aadhar_back_image=?,
//       bank_passbook_image=?,
//       marksheet_10_image=?,
//       marksheet_12_image=?,
//       college_marksheet_image=?,
//       emergency_contact_name=?,
//       emergency_contact_phone=?,
//       emergency_contact_relation=?
//       WHERE id=?`,
//       [
//         employee_name,
//         email,
//         phone,
//         date_of_birth,
//         gender,
//         address,
//         aadhar_number,
//         pan_number,
//         bank_name,
//         bank_account_number,
//         ifsc_code,
//         pan_card_image,
//         aadhar_front_image,
//         aadhar_back_image,
//         bank_passbook_image,
//         marksheet_10_image,
//         marksheet_12_image,
//         college_marksheet_image,
//         emergency_contact_name,
//         emergency_contact_phone,
//         emergency_contact_relation,
//         id
//       ]
//     );

//     res.json({
//       success:true,
//       message:"Employee updated successfully",
//       data: {
//         ...oldData[0],
//         ...req.body,
//         pan_card_image,
//         aadhar_front_image,
//         aadhar_back_image,
//         bank_passbook_image,
//         marksheet_10_image,
//         marksheet_12_image,
//         college_marksheet_image
//       }

//     });

//   } catch (error) {

//     deleteFiles(req.files);

//     res.status(500).json({
//       success:false,
//       message:"Server error"
//     });

//   }
// };

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query(
      "SELECT * FROM employees_details WHERE id=?",
      [id],
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const emp = existing[0];

    let {
      employee_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      aadhar_number,
      pan_number,
      bank_name,
      bank_account_number,
      ifsc_code,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
    } = req.body;

    /* ---------------- VALIDATE ONLY IF PROVIDED ---------------- */

    if (employee_name !== undefined) {
      if (employee_name.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: "Employee name must be at least 3 characters",
        });
      }
      employee_name = employee_name.trim();
    }

    if (phone !== undefined) {
      if (!/^[0-9]{10}$/.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          message: "Phone must be 10 digits",
        });
      }
      phone = phone.trim();
    }

    if (email !== undefined) {
      email = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }
    }

    if (aadhar_number && !/^[0-9]{12}$/.test(aadhar_number)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Aadhaar number",
      });
    }

    if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAN format",
      });
    }

    if (ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IFSC code",
      });
    }

    /* ---------------- DUPLICATE CHECK ---------------- */

    const duplicateError = await checkDuplicateEmployeeupdate({
      email,
      phone,
      aadhar_number,
      pan_number,
      excludeId: id,
    });

    if (duplicateError) {
      deleteFiles(req.files);

      return res.status(400).json({
        success: false,
        message: duplicateError,
      });
    }

    /* ---------------- FILE HANDLING ---------------- */

    const pan_card_image =
      req.files?.pan_card_image?.[0]?.filename || emp.pan_card_image;

    const aadhar_front_image =
      req.files?.aadhar_front_image?.[0]?.filename || emp.aadhar_front_image;

    const aadhar_back_image =
      req.files?.aadhar_back_image?.[0]?.filename || emp.aadhar_back_image;

    const bank_passbook_image =
      req.files?.bank_passbook_image?.[0]?.filename || emp.bank_passbook_image;

    const marksheet_10_image =
      req.files?.marksheet_10_image?.[0]?.filename || emp.marksheet_10_image;

    const marksheet_12_image =
      req.files?.marksheet_12_image?.[0]?.filename || emp.marksheet_12_image;

    const college_marksheet_image =
      req.files?.college_marksheet_image?.[0]?.filename ||
      emp.college_marksheet_image;

    /* ---------------- MERGE DATA ---------------- */

    const updatedData = {
      employee_name: employee_name ?? emp.employee_name,
      email: email ?? emp.email,
      phone: phone ?? emp.phone,
      date_of_birth: date_of_birth ?? emp.date_of_birth,
      gender: gender ?? emp.gender,
      address: address ?? emp.address,
      aadhar_number: aadhar_number ?? emp.aadhar_number,
      pan_number: pan_number ?? emp.pan_number,
      bank_name: bank_name ?? emp.bank_name,
      bank_account_number: bank_account_number ?? emp.bank_account_number,
      ifsc_code: ifsc_code ?? emp.ifsc_code,
      emergency_contact_name:
        emergency_contact_name ?? emp.emergency_contact_name,
      emergency_contact_phone:
        emergency_contact_phone ?? emp.emergency_contact_phone,
      emergency_contact_relation:
        emergency_contact_relation ?? emp.emergency_contact_relation,
      pan_card_image,
      aadhar_front_image,
      aadhar_back_image,
      bank_passbook_image,
      marksheet_10_image,
      marksheet_12_image,
      college_marksheet_image,
    };

    /* ---------------- UPDATE ---------------- */

    await db.query(
      `UPDATE employees_details
      SET
      employee_name=?,
      email=?,
      phone=?,
      date_of_birth=?,
      gender=?,
      address=?,
      aadhar_number=?,
      pan_number=?,
      bank_name=?,
      bank_account_number=?,
      ifsc_code=?,
      pan_card_image=?,
      aadhar_front_image=?,
      aadhar_back_image=?,
      bank_passbook_image=?,
      marksheet_10_image=?,
      marksheet_12_image=?,
      college_marksheet_image=?,
      emergency_contact_name=?,
      emergency_contact_phone=?,
      emergency_contact_relation=?
      WHERE id=?`,
      [
        updatedData.employee_name,
        updatedData.email,
        updatedData.phone,
        updatedData.date_of_birth,
        updatedData.gender,
        updatedData.address,
        updatedData.aadhar_number,
        updatedData.pan_number,
        updatedData.bank_name,
        updatedData.bank_account_number,
        updatedData.ifsc_code,
        updatedData.pan_card_image,
        updatedData.aadhar_front_image,
        updatedData.aadhar_back_image,
        updatedData.bank_passbook_image,
        updatedData.marksheet_10_image,
        updatedData.marksheet_12_image,
        updatedData.college_marksheet_image,
        updatedData.emergency_contact_name,
        updatedData.emergency_contact_phone,
        updatedData.emergency_contact_relation,
        id,
      ],
    );

    res.json({
      success: true,
      message: "Employee updated successfully",
      newdata: updatedData,
      old_data: emp,
    });
  } catch (error) {
    deleteFiles(req.files);

    res.status(500).json({
      success: false,
      message: "Server error",
      message: error.message,
    });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM employees_details WHERE id=?",
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const emp = rows[0];

    const files = [
      emp.pan_card_image,
      emp.aadhar_front_image,
      emp.aadhar_back_image,
      emp.bank_passbook_image,
      emp.marksheet_10_image,
      emp.marksheet_12_image,
      emp.college_marksheet_image,
    ];

    files.forEach((file) => {
      if (file) {
        const filePath = `uploads/employees/${file}`;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });

    await db.query("DELETE FROM employees_details WHERE id=?", [id]);

    res.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
