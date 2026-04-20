export const createCompanyGstNumberTable = async (db) => {
//   await db.query(`
//         CREATE TABLE IF NOT EXISTS company_gst_number (
//             id INT AUTO_INCREMENT PRIMARY KEY,

//             gst_number CHAR(15) NOT NULL,

//             legal_name VARCHAR(255) NOT NULL,
//             trade_name VARCHAR(255),

//             state_code VARCHAR(5),
//             address TEXT,

//             is_active BOOLEAN DEFAULT TRUE,
//             is_default BOOLEAN DEFAULT FALSE,

//             created_by INT,
//             updated_by INT,

//             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//             updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

//             UNIQUE KEY uniq_gst_number (gst_number),

//             /* enforce only one default */
//             default_flag TINYINT 
//               GENERATED ALWAYS AS (CASE WHEN is_default = 1 THEN 1 ELSE NULL END) STORED,

//             UNIQUE KEY uniq_default_gst (default_flag)
            
//         );
//     `);

await db.query(`
        CREATE TABLE IF NOT EXISTS company_gst_number (
            id INT AUTO_INCREMENT PRIMARY KEY,

            gst_number CHAR(15) NOT NULL,

            is_active BOOLEAN DEFAULT TRUE,
            is_default BOOLEAN DEFAULT FALSE,

            created_by INT,
            updated_by INT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uniq_gst_number (gst_number),

            /* enforce only one default */
            default_flag TINYINT 
              GENERATED ALWAYS AS (CASE WHEN is_default = 1 THEN 1 ELSE NULL END) STORED,
            
            UNIQUE KEY uniq_default_gst (default_flag)
            
        );
    `);

};
