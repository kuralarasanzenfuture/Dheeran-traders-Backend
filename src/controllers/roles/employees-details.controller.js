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
    "SELECT employee_code FROM employees ORDER BY id DESC LIMIT 1"
  );

  if (!rows.length) return "DTT-EMP-001";

  const lastCode = rows[0].employee_code; // DTT-EMP-001
  const lastNumber = parseInt(lastCode.split("-")[2], 10);
  const nextNumber = String(lastNumber + 1).padStart(3, "0");

  return `DTT-EMP-${nextNumber}`;
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

export const createEmployee = async (req, res) => {
  try {

    const employee_code = await generateEmployeeCode();

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
    } = req.body;

    const pan_card_image = req.files?.pan_card_image?.[0]?.filename || null;
    const aadhar_front_image = req.files?.aadhar_front_image?.[0]?.filename || null;
    const aadhar_back_image = req.files?.aadhar_back_image?.[0]?.filename || null;
    const bank_passbook_image = req.files?.bank_passbook_image?.[0]?.filename || null;
    const marksheet_10_image = req.files?.marksheet_10_image?.[0]?.filename || null;
    const marksheet_12_image = req.files?.marksheet_12_image?.[0]?.filename || null;
    const college_marksheet_image = req.files?.college_marksheet_image?.[0]?.filename || null;

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
      ]
    );

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee_code,
      id: result.insertId,
    });

  } catch (error) {

    deleteFiles(req.files);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getEmployees = async (req, res) => {
  try {

    const [rows] = await db.query(
      "SELECT * FROM employees_details ORDER BY id DESC"
    );

    res.json({
      success: true,
      data: rows,
    });

  } catch (error) {
    deleteFiles(req.files);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateEmployee = async (req, res) => {

  try {

    const { id } = req.params;

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
      emergency_contact_relation
    } = req.body;

    const [existing] = await db.query(
      "SELECT * FROM employees_details WHERE id=?",
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        success:false,
        message:"Employee not found"
      });
    }

    const emp = existing[0];

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
      req.files?.college_marksheet_image?.[0]?.filename || emp.college_marksheet_image;

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
        id
      ]
    );

    res.json({
      success:true,
      message:"Employee updated successfully"
    });

  } catch (error) {

    deleteFiles(req.files);

    res.status(500).json({
      success:false,
      message:"Server error"
    });

  }

};

export const deleteEmployee = async (req,res)=>{
  try{

    const {id} = req.params;

    const [rows] = await db.query(
      "SELECT * FROM employees_details WHERE id=?",
      [id]
    );

    if(!rows.length){
      return res.status(404).json({
        success:false,
        message:"Employee not found"
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
      emp.college_marksheet_image
    ];

    files.forEach(file=>{
      if(file){
        const filePath = `uploads/employees/${file}`;
        if(fs.existsSync(filePath)){
          fs.unlinkSync(filePath);
        }
      }
    });

    await db.query(
      "DELETE FROM employees_details WHERE id=?",
      [id]
    );

    res.json({
      success:true,
      message:"Employee deleted successfully"
    });

  }catch(error){
    res.status(500).json({
      success:false,
      message:"Server Error"
    });
  }
}