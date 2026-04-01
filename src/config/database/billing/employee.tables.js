export const createEmployeeTables = async (db) => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_code VARCHAR(20) UNIQUE,
        employee_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE,
        phone VARCHAR(20),
        date_of_birth DATE,
        gender ENUM('male','female'),
        address TEXT,
        aadhar_number VARCHAR(20),
        pan_number VARCHAR(20),
        bank_name VARCHAR(100),
        bank_account_number VARCHAR(30),
        ifsc_code VARCHAR(20),
        emergency_contact_name VARCHAR(150),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relation VARCHAR(50),
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await seedEmployees(db);
};


const seedEmployees = async (db) => {
  const employees = [
    ['EMP001','Arun Kumar','arun.kumar@company.com','9000000001','1995-06-15','male','Nethaji Bye Pass Road, Dharmapuri, Tamil Nadu','123412341234','ABCDE1234F','State Bank of India','12345678901','SBIN0001234','Kumar','9000000101','Father','active'],
    ['EMP002','Priya Raman','priya.raman@company.com','9000000002','1997-08-20','female','Salem Main Road, Dharmapuri, Tamil Nadu','234523452345','PQRSX5678L','Indian Bank','23456789012','IDIB000D001','Raman','9000000102','Father','active'],
    ['EMP003','Karthik Raj','karthik.raj@company.com','9000000003','1993-03-10','male','Pennagaram Road, Dharmapuri, Tamil Nadu','345634563456','LMNOP4321K','Canara Bank','34567890123','CNRB0004567','Raj','9000000103','Brother','active'],
    ['EMP004','Divya Shankar','divya.shankar@company.com','9000000004','1998-11-05','female','Bharathipuram, Dharmapuri, Tamil Nadu','456745674567','ZXCVB6789P','HDFC Bank','45678901234','HDFC0001234','Shankar','9000000104','Father','active'],
    ['EMP005','Vignesh M','vignesh.m@company.com','9000000005','1992-01-25','male','Harur Road, Dharmapuri, Tamil Nadu','567856785678','ASDFG9876Q','ICICI Bank','56789012345','ICIC0005678','Murugan','9000000105','Father','active'],

    ['EMP006','Sangeetha R','sangeetha.r@company.com','9000000006','1996-09-12','female','Palacode, Dharmapuri District, Tamil Nadu','678967896789','QWERT1234Y','Axis Bank','67890123456','UTIB0000789','Ravi','9000000106','Husband','active'],
    ['EMP007','Manoj Kumar','manoj.kumar@company.com','9000000007','1994-07-18','male','Karimangalam, Dharmapuri District, Tamil Nadu','789078907890','HJKLZ4567R','Indian Overseas Bank','78901234567','IOBA0002345','Kumar','9000000107','Father','active'],
    ['EMP008','Lakshmi Devi','lakshmi.devi@company.com','9000000008','1999-02-28','female','Nallampalli, Dharmapuri District, Tamil Nadu','890189018901','BNMKO7654T','Union Bank of India','89012345678','UBIN0003456','Devi','9000000108','Mother','active'],
    ['EMP009','Prakash S','prakash.s@company.com','9000000009','1991-12-14','male','Pappireddipatti, Dharmapuri District, Tamil Nadu','901290129012','GHJKL3210U','Bank of Baroda','90123456789','BARB0DHA123','Subramani','9000000109','Father','active'],
    ['EMP010','Meena K','meena.k@company.com','9000000010','1997-05-30','female','Morappur, Dharmapuri District, Tamil Nadu','112211221122','POIUY6543W','Kotak Mahindra Bank','11223344556','KKBK0007890','Kannan','9000000110','Brother','active'],
  ];

  for (const emp of employees) {
    await db.query(
      `INSERT IGNORE INTO employees 
      (employee_code, employee_name, email, phone, date_of_birth, gender, address,
       aadhar_number, pan_number, bank_name, bank_account_number, ifsc_code,
       emergency_contact_name, emergency_contact_phone, emergency_contact_relation, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      emp
    );
  }
};



// INSERT INTO employees (
//   employee_code, employee_name, email, phone, date_of_birth, gender, address,
//   aadhar_number, pan_number, bank_name, bank_account_number, ifsc_code,
//   emergency_contact_name, emergency_contact_phone, emergency_contact_relation, status
// ) VALUES

// ('EMP001', 'Arun Kumar', 'arun.kumar@company.com', '9000000001', '1995-06-15', 'male',
//  'Nethaji Bye Pass Road, Dharmapuri, Tamil Nadu',
//  '123412341234', 'ABCDE1234F', 'State Bank of India', '12345678901', 'SBIN0001234',
//  'Kumar', '9000000101', 'Father', 'active'),

// ('EMP002', 'Priya Raman', 'priya.raman@company.com', '9000000002', '1997-08-20', 'female',
//  'Salem Main Road, Dharmapuri, Tamil Nadu',
//  '234523452345', 'PQRSX5678L', 'Indian Bank', '23456789012', 'IDIB000D001',
//  'Raman', '9000000102', 'Father', 'active'),

// ('EMP003', 'Karthik Raj', 'karthik.raj@company.com', '9000000003', '1993-03-10', 'male',
//  'Pennagaram Road, Dharmapuri, Tamil Nadu',
//  '345634563456', 'LMNOP4321K', 'Canara Bank', '34567890123', 'CNRB0004567',
//  'Raj', '9000000103', 'Brother', 'active'),

// ('EMP004', 'Divya Shankar', 'divya.shankar@company.com', '9000000004', '1998-11-05', 'female',
//  'Bharathipuram, Dharmapuri, Tamil Nadu',
//  '456745674567', 'ZXCVB6789P', 'HDFC Bank', '45678901234', 'HDFC0001234',
//  'Shankar', '9000000104', 'Father', 'active'),

// ('EMP005', 'Vignesh M', 'vignesh.m@company.com', '9000000005', '1992-01-25', 'male',
//  'Harur Road, Dharmapuri, Tamil Nadu',
//  '567856785678', 'ASDFG9876Q', 'ICICI Bank', '56789012345', 'ICIC0005678',
//  'Murugan', '9000000105', 'Father', 'active'),

// ('EMP006', 'Sangeetha R', 'sangeetha.r@company.com', '9000000006', '1996-09-12', 'female',
//  'Palacode, Dharmapuri District, Tamil Nadu',
//  '678967896789', 'QWERT1234Y', 'Axis Bank', '67890123456', 'UTIB0000789',
//  'Ravi', '9000000106', 'Husband', 'active'),

// ('EMP007', 'Manoj Kumar', 'manoj.kumar@company.com', '9000000007', '1994-07-18', 'male',
//  'Karimangalam, Dharmapuri District, Tamil Nadu',
//  '789078907890', 'HJKLZ4567R', 'Indian Overseas Bank', '78901234567', 'IOBA0002345',
//  'Kumar', '9000000107', 'Father', 'active'),

// ('EMP008', 'Lakshmi Devi', 'lakshmi.devi@company.com', '9000000008', '1999-02-28', 'female',
//  'Nallampalli, Dharmapuri District, Tamil Nadu',
//  '890189018901', 'BNMKO7654T', 'Union Bank of India', '89012345678', 'UBIN0003456',
//  'Devi', '9000000108', 'Mother', 'active'),

// ('EMP009', 'Prakash S', 'prakash.s@company.com', '9000000009', '1991-12-14', 'male',
//  'Pappireddipatti, Dharmapuri District, Tamil Nadu',
//  '901290129012', 'GHJKL3210U', 'Bank of Baroda', '90123456789', 'BARB0DHA123',
//  'Subramani', '9000000109', 'Father', 'active'),

// ('EMP010', 'Meena K', 'meena.k@company.com', '9000000010', '1997-05-30', 'female',
//  'Morappur, Dharmapuri District, Tamil Nadu',
//  '112211221122', 'POIUY6543W', 'Kotak Mahindra Bank', '11223344556', 'KKBK0007890',
//  'Kannan', '9000000110', 'Brother', 'active');
