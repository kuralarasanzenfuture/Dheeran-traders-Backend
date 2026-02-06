import db from "../../config/db.js";

/**
 * 🔢 GENERATE EMPLOYEE CODE
 * Format: DTT-EMP-001
 */
const generateEmployeeCode = async () => {
  const [rows] = await db.query(
    "SELECT employee_code FROM employees ORDER BY id DESC LIMIT 1"
  );

  if (!rows.length) return "DTT-EMP-001";

  const lastCode = rows[0].employee_code; // DTT-EMP-001
  const lastNumber = parseInt(lastCode.split("-")[2], 10);
  const nextNumber = String(lastNumber + 1).padStart(3, "0");

  return `DTT-EMP-${nextNumber}`;
};

/**
 * 🟢 CREATE EMPLOYEE
 */
export const createEmployee = async (req, res) => {
  try {
    const {
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
      status,
    } = req.body;

    if (!employee_name) {
      return res.status(400).json({
        message: "Employee name is required",
      });
    }

    // 🔍 Email duplicate check (important)
    if (email) {
      const [exists] = await db.query(
        "SELECT id FROM employees WHERE email = ?",
        [email]
      );

      if (exists.length) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }
    }

    const employee_code = await generateEmployeeCode();

    const [result] = await db.query(
      `
      INSERT INTO employees (
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
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relation,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        employee_code,
        employee_name,
        email || null,
        phone || null,
        date_of_birth || null,
        gender || null,
        address || null,
        aadhar_number || null,
        pan_number || null,
        bank_name || null,
        bank_account_number || null,
        ifsc_code || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        emergency_contact_relation || null,
        status || "active",
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM employees WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Employee created successfully",
      employee: rows[0],
    });
  } catch (error) {
    console.error("Create employee error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * 📄 GET ALL EMPLOYEES
 */
export const getEmployees = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM employees ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * 🔍 GET EMPLOYEE BY ID
 */
export const getEmployeeById = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM employees WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get employee error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ✏️ UPDATE EMPLOYEE
 */
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent updating employee_code
    if (req.body.employee_code) {
      delete req.body.employee_code;
    }

    const [result] = await db.query(
      "UPDATE employees SET ? WHERE id = ?",
      [req.body, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM employees WHERE id = ?",
      [id]
    );

    res.json({
      message: "Employee updated successfully",
      employee: rows[0],
    });
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ❌ DELETE EMPLOYEE
 */
export const deleteEmployee = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM employees WHERE id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.json({
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Delete employee error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};