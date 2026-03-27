import db from "../../config/db.js";
import fs from "fs";
import path from "path";
import { validate } from "../../middlewares/validate.middleware.js";
import { createEmployeeSchema, updateEmployeeSchema } from "../../validations/employee.validation.js";
import { log } from "console";
import formatDate from "../../services/formatDate.service.js";

// 🔥 helper
// const deleteFiles = (files) => {
//   if (!files) return;

//   Object.values(files).forEach((fileArray) => {
//     fileArray.forEach((file) => {
//       const filePath = file.path;
//       if (fs.existsSync(filePath)) {
//         fs.unlinkSync(filePath);
//       }
//     });
//   });
// };

// 🔥 helper
const deleteFiles = (files) => {
  if (!files) return;

  Object.values(files).forEach((fileArray) => {
    fileArray.forEach((file) => {
      fs.unlink(file.path, () => {});
    });
  });
};

// 🔥 safe employee code generator
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

// const allowedFields = [
//   "employee_name",
//   "email",
//   "phone",
//   "date_of_birth",
//   "gender",
//   "address",
//   "aadhar_number",
//   "pan_number",
//   "bank_name",
//   "bank_account_number",
//   "ifsc_code",
//   "emergency_contact_name",
//   "emergency_contact_phone",
//   "emergency_contact_relation",
// ];

// export const createEmployee = async (req, res) => {
//   try {
//     const employee_code = await generateEmployeeCode();

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

//     const receivedFields = Object.keys(req.body);

//     const invalidFields = receivedFields.filter(
//       (field) => !allowedFields.includes(field),
//     );

//     if (invalidFields.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid fields sent in request",
//         invalid_fields: invalidFields,
//       });
//     }

//     if (!req.body.employee_name) {
//       return res.status(400).json({
//         success: false,
//         message: "employee_name is required",
//       });
//     }

//     if (!req.body.phone) {
//       return res.status(400).json({
//         success: false,
//         message: "phone is required",
//       });
//     }

//     /* ---------------- REQUIRED VALIDATION ---------------- */

//     // if (!employee_name || employee_name.trim().length < 3) {
//     //   return res.status(400).json({
//     //     success: false,
//     //     message: "Employee name must be at least 3 characters",
//     //   });
//     // }

//     // if (!phone || !/^[0-9]{10}$/.test(phone.trim())) {
//     //   return res.status(400).json({
//     //     success: false,
//     //     message: "Phone must be a valid 10 digit number and required",
//     //   });
//     // }

//     if (employee_name.trim().length < 3) {
//       return res.status(400).json({
//         success: false,
//         message: "Employee name must be at least 3 characters",
//       });
//     }

//     if (!/^[0-9]{10}$/.test(phone.trim())) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone must be a valid 10 digit number",
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
//         success: false,
//         message: "Invalid email format",
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

//     if (ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid IFSC code",
//       });
//     }

//     /* ---------------- DUPLICATE CHECK ---------------- */

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

//     /* ---------------- FILES ---------------- */

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

//     /* ---------------- INSERT ---------------- */

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
//       data: rows[0],
//     });
//   } catch (error) {
//     deleteFiles(req.files);

//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

const allowedFields = [
  "user_id",
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

// export const createEmployee = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     /* =========================
//        FIELD VALIDATION (FIXED)
//     ========================= */

//     const receivedFields = Object.keys(req.body);

//     const invalidFields = receivedFields.filter(
//       (field) => !allowedFields.includes(field.trim()) // 🔥 FIX
//     );

//     if (invalidFields.length > 0) {
//       deleteFiles(req.files);
//       return res.status(400).json({
//         success: false,
//         message: "Invalid fields sent in request",
//         invalid_fields: invalidFields,
//       });
//     }

//     /* =========================
//        DESTRUCTURE
//     ========================= */

//     let {
//       user_id,
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

//     console.log(req.body);
// console.log(req.files);

//     /* =========================
//        REQUIRED CHECK
//     ========================= */

//     if (!user_id || !employee_name || !phone) {
//       deleteFiles(req.files);
//       return res.status(400).json({
//         success: false,
//         message: "user_id, employee_name, phone are required",
//       });
//     }

//     /* =========================
//        BASIC VALIDATION
//     ========================= */

//     employee_name = employee_name.trim();
//     phone = phone.trim();

//     if (employee_name.length < 3) {
//       return res.status(400).json({
//         success: false,
//         message: "Employee name must be at least 3 characters",
//       });
//     }

//     if (!/^[0-9]{10}$/.test(phone)) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone must be valid 10 digit number",
//       });
//     }

//     /* =========================
//        USER + ROLE VALIDATION
//     ========================= */

//     const [users] = await connection.query(
//       `
//       SELECT u.id, u.status, r.status AS role_status
//       FROM users_roles u
//       JOIN role_based r ON u.role_id = r.id
//       WHERE u.id = ?
//       `,
//       [user_id]
//     );

//     if (!users.length) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const user = users[0];

//     if (user.status !== "active") {
//       return res.status(403).json({
//         success: false,
//         message: "User is inactive",
//       });
//     }

//     if (user.role_status !== "active") {
//       return res.status(403).json({
//         success: false,
//         message: "User role is inactive",
//       });
//     }

//     /* =========================
//        ONE USER → ONE EMPLOYEE
//     ========================= */

//     const [exists] = await connection.query(
//       `SELECT id FROM employees_details WHERE user_id = ?`,
//       [user_id]
//     );

//     if (exists.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Employee already exists for this user",
//       });
//     }

//     /* =========================
//        SANITIZE
//     ========================= */

//     email = email?.trim().toLowerCase() || null;
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

//     /* =========================
//        OPTIONAL VALIDATION
//     ========================= */

//     if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid email format",
//       });
//     }

//     if (gender && !["male", "female", "other"].includes(gender)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid gender",
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

//     if (ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid IFSC code",
//       });
//     }

//     /* =========================
//        DUPLICATE CHECK
//     ========================= */

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

//     /* =========================
//        FILES
//     ========================= */

//     const getFile = (name) =>
//       req.files?.[name]?.[0]?.filename || null;

//     /* =========================
//        GENERATE CODE (moved here)
//     ========================= */

//     const employee_code = await generateEmployeeCode(connection);

//     /* =========================
//        INSERT
//     ========================= */

//     const [result] = await connection.query(
//       `
//       INSERT INTO employees_details (
//         user_id,
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
//       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
//       `,
//       [
//         user_id,
//         employee_code,
//         employee_name,
//         email,
//         phone,
//         date_of_birth || null,
//         gender,
//         address,
//         aadhar_number,
//         pan_number,
//         bank_name,
//         bank_account_number,
//         ifsc_code,
//         getFile("pan_card_image"),
//         getFile("aadhar_front_image"),
//         getFile("aadhar_back_image"),
//         getFile("bank_passbook_image"),
//         getFile("marksheet_10_image"),
//         getFile("marksheet_12_image"),
//         getFile("college_marksheet_image"),
//         emergency_contact_name,
//         emergency_contact_phone,
//         emergency_contact_relation,
//       ]
//     );

//     await connection.commit();

//     const [rows] = await connection.query(
//       "SELECT * FROM employees_details WHERE id=?",
//       [result.insertId]
//     );

//     return res.status(201).json({
//       success: true,
//       message: "Employee created successfully",
//       employee_code,
//       data: rows[0],
//     });

//   } catch (error) {
//     await connection.rollback();
//     deleteFiles(req.files);

//     if (error.code === "ER_DUP_ENTRY") {
//       return res.status(400).json({
//         success: false,
//         message: "Duplicate entry detected",
//       });
//     }

//     console.error(error);

//     return res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });

//   } finally {
//     connection.release();
//   }
// };

export const createEmployee = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      user_id,
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

    pan_number = pan_number?.trim().toUpperCase();

    const { error, value } = createEmployeeSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    const data = value;

    console.log(data);

    /* =========================
       USER VALIDATION
    ========================= */

    const [users] = await connection.query(
      `
      SELECT u.id, u.status, r.status AS role_status
      FROM users_roles u
      JOIN role_based r ON u.role_id = r.id
      WHERE u.id = ?
      `,
      [user_id],
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "User is inactive",
      });
    }

    if (user.role_status !== "active") {
      return res.status(403).json({
        success: false,
        message: "User role is inactive",
      });
    }

    /* =========================
       ONE USER → ONE EMPLOYEE
    ========================= */

    const [exists] = await connection.query(
      `SELECT id FROM employees_details WHERE user_id=?`,
      [user_id],
    );

    if (exists.length) {
      return res.status(400).json({
        success: false,
        message: "Employee already exists",
      });
    }

    /* =========================
       DUPLICATE CHECK
    ========================= */

    const duplicateError = await checkDuplicateEmployee({
      email,
      phone,
      aadhar_number,
      pan_number,
    });

    if (duplicateError) {
      return res.status(400).json({
        success: false,
        message: duplicateError,
      });
    }

    /* =========================
       FILES
    ========================= */

    const getFile = (name) => req.files?.[name]?.[0]?.filename || null;

    /* =========================
       GENERATE CODE
    ========================= */

    const employee_code = await generateEmployeeCode(connection);

    /* =========================
       INSERT
    ========================= */

    const [result] = await connection.query(
      `
      INSERT INTO employees_details (
        user_id, employee_code, employee_name, email, phone,
        date_of_birth, gender, address, aadhar_number, pan_number,
        bank_name, bank_account_number, ifsc_code,
        pan_card_image, aadhar_front_image, aadhar_back_image,
        bank_passbook_image, marksheet_10_image, marksheet_12_image,
        college_marksheet_image,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `,
      [
        user_id,
        employee_code,
        employee_name,
        email,
        phone,
        date_of_birth || null,
        gender,
        address,
        aadhar_number,
        pan_number,
        bank_name,
        bank_account_number,
        ifsc_code,
        getFile("pan_card_image"),
        getFile("aadhar_front_image"),
        getFile("aadhar_back_image"),
        getFile("bank_passbook_image"),
        getFile("marksheet_10_image"),
        getFile("marksheet_12_image"),
        getFile("college_marksheet_image"),
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relation,
      ],
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee_code,
      id: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    deleteFiles(req.files);

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  } finally {
    connection.release();
  }
};

// export const getEmployees = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       "SELECT * FROM employees_details ORDER BY id DESC",
//     );

//     res.json({
//       success: true,
//       data: rows,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });
//   }
// };

// date fixed
export const getEmployees = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM employees_details ORDER BY id DESC"
    );

    // 🔥 Fix date for all records
    const formatted = rows.map((emp) => ({
      ...emp,
      date_of_birth: formatDate(emp.date_of_birth),
    }));

    return res.json({
      success: true,
      data: formatted,
    });

  } catch (error) {
    console.error("getEmployees error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// export const getEmployeeById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [rows] = await db.query(
//       "SELECT * FROM employees_details WHERE id=?",
//       [id],
//     );

//     if (!rows.length) {
//       return res.status(404).json({
//         success: false,
//         message: "Employee not found",
//       });
//     }

//     res.json({
//       success: true,
//       data: rows[0],
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });
//   }
// };

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

// export const updateEmployee = async (req, res) => {
//   try {
//     const { id } = req.params;

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

//     /* ---------------- VALIDATE ONLY IF PROVIDED ---------------- */

//     if (employee_name !== undefined) {
//       if (employee_name.trim().length < 3) {
//         return res.status(400).json({
//           success: false,
//           message: "Employee name must be at least 3 characters",
//         });
//       }
//       employee_name = employee_name.trim();
//     }

//     if (phone !== undefined) {
//       if (!/^[0-9]{10}$/.test(phone.trim())) {
//         return res.status(400).json({
//           success: false,
//           message: "Phone must be 10 digits",
//         });
//       }
//       phone = phone.trim();
//     }

//     if (email !== undefined) {
//       email = email.trim().toLowerCase();
//       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid email format",
//         });
//       }
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

//     if (ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid IFSC code",
//       });
//     }

//     /* ---------------- DUPLICATE CHECK ---------------- */

//     const duplicateError = await checkDuplicateEmployeeupdate({
//       email,
//       phone,
//       aadhar_number,
//       pan_number,
//       excludeId: id,
//     });

//     if (duplicateError) {
//       deleteFiles(req.files);

//       return res.status(400).json({
//         success: false,
//         message: duplicateError,
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
//       req.files?.college_marksheet_image?.[0]?.filename ||
//       emp.college_marksheet_image;

//     /* ---------------- MERGE DATA ---------------- */

//     const updatedData = {
//       employee_name: employee_name ?? emp.employee_name,
//       email: email ?? emp.email,
//       phone: phone ?? emp.phone,
//       date_of_birth: date_of_birth ?? emp.date_of_birth,
//       gender: gender ?? emp.gender,
//       address: address ?? emp.address,
//       aadhar_number: aadhar_number ?? emp.aadhar_number,
//       pan_number: pan_number ?? emp.pan_number,
//       bank_name: bank_name ?? emp.bank_name,
//       bank_account_number: bank_account_number ?? emp.bank_account_number,
//       ifsc_code: ifsc_code ?? emp.ifsc_code,
//       emergency_contact_name:
//         emergency_contact_name ?? emp.emergency_contact_name,
//       emergency_contact_phone:
//         emergency_contact_phone ?? emp.emergency_contact_phone,
//       emergency_contact_relation:
//         emergency_contact_relation ?? emp.emergency_contact_relation,
//       pan_card_image,
//       aadhar_front_image,
//       aadhar_back_image,
//       bank_passbook_image,
//       marksheet_10_image,
//       marksheet_12_image,
//       college_marksheet_image,
//     };

//     /* ---------------- UPDATE ---------------- */

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
//         updatedData.employee_name,
//         updatedData.email,
//         updatedData.phone,
//         updatedData.date_of_birth,
//         updatedData.gender,
//         updatedData.address,
//         updatedData.aadhar_number,
//         updatedData.pan_number,
//         updatedData.bank_name,
//         updatedData.bank_account_number,
//         updatedData.ifsc_code,
//         updatedData.pan_card_image,
//         updatedData.aadhar_front_image,
//         updatedData.aadhar_back_image,
//         updatedData.bank_passbook_image,
//         updatedData.marksheet_10_image,
//         updatedData.marksheet_12_image,
//         updatedData.college_marksheet_image,
//         updatedData.emergency_contact_name,
//         updatedData.emergency_contact_phone,
//         updatedData.emergency_contact_relation,
//         id,
//       ],
//     );

//     res.json({
//       success: true,
//       message: "Employee updated successfully",
//       newdata: updatedData,
//       old_data: emp,
//     });
//   } catch (error) {
//     deleteFiles(req.files);

//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       message: error.message,
//     });
//   }
// };

export const getEmployeeById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id || Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM employees_details WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const employee = rows[0];

    // 🔥 Fix date
    employee.date_of_birth = formatDate(employee.date_of_birth);

    return res.json({
      success: true,
      data: employee,
    });

  } catch (error) {
    console.error("getEmployeeById error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateEmployee = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    /* =========================
       CHECK EXISTING
    ========================= */

    const [existing] = await connection.query(
      "SELECT * FROM employees_details WHERE id=?",
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const emp = existing[0];
    let data = { ...req.body };

    const { error, value } = updateEmployeeSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    data = value;

    console.log(data);

    /* =========================
       SANITIZE INPUT
    ========================= */

    if (data.employee_name !== undefined) {
      data.employee_name = data.employee_name.trim();
      if (data.employee_name.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Employee name must be at least 3 characters",
        });
      }
    }

    if (data.phone !== undefined) {
      data.phone = data.phone.trim();
      if (!/^[0-9]{10}$/.test(data.phone)) {
        return res.status(400).json({
          success: false,
          message: "Phone must be 10 digits",
        });
      }
    }

    if (data.email !== undefined) {
      data.email = data.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }
    }

    if (data.aadhar_number !== undefined) {
      if (!/^[0-9]{12}$/.test(data.aadhar_number)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Aadhaar number",
        });
      }
    }

    if (data.pan_number !== undefined) {
      data.pan_number = data.pan_number.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pan_number)) {
        return res.status(400).json({
          success: false,
          message: "Invalid PAN format",
        });
      }
    }

    if (data.ifsc_code !== undefined) {
      data.ifsc_code = data.ifsc_code.trim().toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifsc_code)) {
        return res.status(400).json({
          success: false,
          message: "Invalid IFSC code",
        });
      }
    }

    /* =========================
       DUPLICATE CHECK
    ========================= */

    const duplicateError = await checkDuplicateEmployeeupdate({
      ...data,
      excludeId: id,
    });

    if (duplicateError) {
      deleteFiles(req.files);
      return res.status(400).json({
        success: false,
        message: duplicateError,
      });
    }

    /* =========================
       FILE HANDLING (CLEAN)
    ========================= */

    const getFile = (name, old) =>
      req.files?.[name]?.[0]?.filename || old;

    /* =========================
       MERGE DATA
    ========================= */

    const updatedData = {
      employee_name: data.employee_name ?? emp.employee_name,
      email: data.email ?? emp.email,
      phone: data.phone ?? emp.phone,
      date_of_birth: data.date_of_birth ?? emp.date_of_birth,
      gender: data.gender ?? emp.gender,
      address: data.address ?? emp.address,
      aadhar_number: data.aadhar_number ?? emp.aadhar_number,
      pan_number: data.pan_number ?? emp.pan_number,
      bank_name: data.bank_name ?? emp.bank_name,
      bank_account_number:
        data.bank_account_number ?? emp.bank_account_number,
      ifsc_code: data.ifsc_code ?? emp.ifsc_code,
      emergency_contact_name:
        data.emergency_contact_name ?? emp.emergency_contact_name,
      emergency_contact_phone:
        data.emergency_contact_phone ?? emp.emergency_contact_phone,
      emergency_contact_relation:
        data.emergency_contact_relation ??
        emp.emergency_contact_relation,

      pan_card_image: getFile("pan_card_image", emp.pan_card_image),
      aadhar_front_image: getFile(
        "aadhar_front_image",
        emp.aadhar_front_image
      ),
      aadhar_back_image: getFile(
        "aadhar_back_image",
        emp.aadhar_back_image
      ),
      bank_passbook_image: getFile(
        "bank_passbook_image",
        emp.bank_passbook_image
      ),
      marksheet_10_image: getFile(
        "marksheet_10_image",
        emp.marksheet_10_image
      ),
      marksheet_12_image: getFile(
        "marksheet_12_image",
        emp.marksheet_12_image
      ),
      college_marksheet_image: getFile(
        "college_marksheet_image",
        emp.college_marksheet_image
      ),
    };

    /* =========================
       UPDATE
    ========================= */

    await connection.query(
      `UPDATE employees_details SET
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
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Employee updated successfully",
      data: updatedData,
    });

  } catch (error) {
    await connection.rollback();
    deleteFiles(req.files);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  } finally {
    connection.release();
  }
};

// export const updateEmployee = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;

//     const [existing] = await connection.query(
//       "SELECT * FROM employees_details WHERE id=?",
//       [id]
//     );

//     if (!existing.length) {
//       return res.status(404).json({
//         success: false,
//         message: "Employee not found",
//       });
//     }

//     const emp = existing[0];

//     // ✅ already validated & cleaned
//     const data = req.body;

//     /* ---------------- DUPLICATE CHECK ---------------- */

//     const duplicateError = await checkDuplicateEmployeeupdate({
//       ...data,
//       excludeId: id,
//     });

//     if (duplicateError) {
//       deleteFiles(req.files);

//       return res.status(400).json({
//         success: false,
//         message: duplicateError,
//       });
//     }

//     /* ---------------- FILE HANDLING ---------------- */

//     const getFile = (name, old) =>
//       req.files?.[name]?.[0]?.filename || old;

//     /* ---------------- MERGE ---------------- */

//     const updatedData = {
//       employee_name: data.employee_name ?? emp.employee_name,
//       email: data.email ?? emp.email,
//       phone: data.phone ?? emp.phone,
//       date_of_birth: data.date_of_birth ?? emp.date_of_birth,
//       gender: data.gender ?? emp.gender,
//       address: data.address ?? emp.address,
//       aadhar_number: data.aadhar_number ?? emp.aadhar_number,
//       pan_number: data.pan_number ?? emp.pan_number,
//       bank_name: data.bank_name ?? emp.bank_name,
//       bank_account_number:
//         data.bank_account_number ?? emp.bank_account_number,
//       ifsc_code: data.ifsc_code ?? emp.ifsc_code,
//       emergency_contact_name:
//         data.emergency_contact_name ?? emp.emergency_contact_name,
//       emergency_contact_phone:
//         data.emergency_contact_phone ?? emp.emergency_contact_phone,
//       emergency_contact_relation:
//         data.emergency_contact_relation ??
//         emp.emergency_contact_relation,

//       pan_card_image: getFile("pan_card_image", emp.pan_card_image),
//       aadhar_front_image: getFile(
//         "aadhar_front_image",
//         emp.aadhar_front_image
//       ),
//       aadhar_back_image: getFile(
//         "aadhar_back_image",
//         emp.aadhar_back_image
//       ),
//       bank_passbook_image: getFile(
//         "bank_passbook_image",
//         emp.bank_passbook_image
//       ),
//       marksheet_10_image: getFile(
//         "marksheet_10_image",
//         emp.marksheet_10_image
//       ),
//       marksheet_12_image: getFile(
//         "marksheet_12_image",
//         emp.marksheet_12_image
//       ),
//       college_marksheet_image: getFile(
//         "college_marksheet_image",
//         emp.college_marksheet_image
//       ),
//     };

//     /* ---------------- UPDATE ---------------- */

//     await connection.query(
//       `UPDATE employees_details SET
//         employee_name=?,
//         email=?,
//         phone=?,
//         date_of_birth=?,
//         gender=?,
//         address=?,
//         aadhar_number=?,
//         pan_number=?,
//         bank_name=?,
//         bank_account_number=?,
//         ifsc_code=?,
//         pan_card_image=?,
//         aadhar_front_image=?,
//         aadhar_back_image=?,
//         bank_passbook_image=?,
//         marksheet_10_image=?,
//         marksheet_12_image=?,
//         college_marksheet_image=?,
//         emergency_contact_name=?,
//         emergency_contact_phone=?,
//         emergency_contact_relation=?
//       WHERE id=?`,
//       [
//         updatedData.employee_name,
//         updatedData.email,
//         updatedData.phone,
//         updatedData.date_of_birth,
//         updatedData.gender,
//         updatedData.address,
//         updatedData.aadhar_number,
//         updatedData.pan_number,
//         updatedData.bank_name,
//         updatedData.bank_account_number,
//         updatedData.ifsc_code,
//         updatedData.pan_card_image,
//         updatedData.aadhar_front_image,
//         updatedData.aadhar_back_image,
//         updatedData.bank_passbook_image,
//         updatedData.marksheet_10_image,
//         updatedData.marksheet_12_image,
//         updatedData.college_marksheet_image,
//         updatedData.emergency_contact_name,
//         updatedData.emergency_contact_phone,
//         updatedData.emergency_contact_relation,
//         id,
//       ]
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       message: "Employee updated successfully",
//       data: updatedData,
//     });

//   } catch (error) {
//     await connection.rollback();
//     deleteFiles(req.files);

//     return res.status(500).json({
//       success: false,
//       message: error.message, // ✅ fixed duplicate key
//     });

//   } finally {
//     connection.release();
//   }
// };

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

export const getEmployeeByUserId = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    // 🔒 Validate ID properly
    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // 🔍 Fetch employee
    const [rows] = await db.query(
      `SELECT * FROM employees_details WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const employee = rows[0];

    // ✅ SAFE DATE HANDLING (no timezone shift, no crash)
    if (employee.date_of_birth) {
      if (employee.date_of_birth instanceof Date) {
        const y = employee.date_of_birth.getFullYear();
        const m = String(employee.date_of_birth.getMonth() + 1).padStart(2, "0");
        const d = String(employee.date_of_birth.getDate()).padStart(2, "0");
        employee.date_of_birth = `${y}-${m}-${d}`;
      } else if (typeof employee.date_of_birth === "string") {
        // Already correct format from DB
        employee.date_of_birth = employee.date_of_birth;
      }
    }

    // 🚀 Clean response (optional but better structure)
    return res.status(200).json({
      success: true,
      // data: {
      //   id: employee.id,
      //   user_id: employee.user_id,
      //   employee_code: employee.employee_code,
      //   employee_name: employee.employee_name,
      //   email: employee.email,
      //   phone: employee.phone,
      //   date_of_birth: employee.date_of_birth,
      //   gender: employee.gender,
      //   address: employee.address,

      //   aadhar_number: employee.aadhar_number,
      //   pan_number: employee.pan_number,

      //   bank_name: employee.bank_name,
      //   bank_account_number: employee.bank_account_number,
      //   ifsc_code: employee.ifsc_code,

      //   documents: {
      //     pan_card_image: employee.pan_card_image,
      //     aadhar_front_image: employee.aadhar_front_image,
      //     aadhar_back_image: employee.aadhar_back_image,
      //     bank_passbook_image: employee.bank_passbook_image,
      //     marksheet_10_image: employee.marksheet_10_image,
      //     marksheet_12_image: employee.marksheet_12_image,
      //     college_marksheet_image: employee.college_marksheet_image,
      //   },

      //   emergency_contact: {
      //     name: employee.emergency_contact_name,
      //     phone: employee.emergency_contact_phone,
      //     relation: employee.emergency_contact_relation,
      //   },

      //   status: employee.status,
      //   created_at: employee.created_at,
      //   updated_at: employee.updated_at,
      // },
      data: employee,
    });

  } catch (error) {
    console.error("getEmployeeByUserId error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
