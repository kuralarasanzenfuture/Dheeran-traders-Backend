export const createEmployeeDetailsTables = async (db) => {

    await db.query(`
      CREATE TABLE IF NOT EXISTS employees_details (
        id INT AUTO_INCREMENT PRIMARY KEY,

        employee_code VARCHAR(20) UNIQUE,
        employee_name VARCHAR(150) NOT NULL,

        email VARCHAR(150) UNIQUE,
        phone VARCHAR(20),

        date_of_birth DATE,
        gender ENUM('male','female','other'),

        address TEXT,

        -- Government IDs
        aadhar_number VARCHAR(20),
        pan_number VARCHAR(20),

        -- Bank Details
        bank_name VARCHAR(100),
        bank_account_number VARCHAR(30),
        ifsc_code VARCHAR(20),

        -- Document Images
        pan_card_image VARCHAR(255),

        aadhar_front_image VARCHAR(255),
        aadhar_back_image VARCHAR(255),

        bank_passbook_image VARCHAR(255),

        marksheet_10_image VARCHAR(255),
        marksheet_12_image VARCHAR(255),
        college_marksheet_image VARCHAR(255),

        -- Emergency Contact
        emergency_contact_name VARCHAR(150),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relation VARCHAR(50),

        status ENUM('active','inactive') DEFAULT 'active',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
    `);

};
