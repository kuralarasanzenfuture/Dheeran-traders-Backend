
// INSERT INTO employees (
//   employee_code, employee_name, email, phone, date_of_birth, gender, address,
//   aadhar_number, pan_number, bank_name, bank_account_number, ifsc_code,
//   emergency_contact_name, emergency_contact_phone, emergency_contact_relation, status
// ) VALUES

// ('EMP101', 'Arun Kumar', 'arun.kumar@dheeran.com', '9100000001', '1995-05-12', 'male',
//  'Nethaji Bye Pass Road, Dharmapuri, Tamil Nadu',
//  '111122223333', 'ABCDE1234F', 'State Bank of India', '12345678901', 'SBIN0001234',
//  'Kumar', '9100000101', 'Father', 'active'),

// ('EMP102', 'Priya R', 'priya.r@dheeran.com', '9100000002', '1997-08-25', 'female',
//  'Salem Main Road, Dharmapuri, Tamil Nadu',
//  '222233334444', 'PQRSX5678L', 'Indian Bank', '23456789012', 'IDIB000D001',
//  'Ravi', '9100000102', 'Father', 'active'),

// ('EMP103', 'Karthik S', 'karthik.s@dheeran.com', '9100000003', '1993-02-18', 'male',
//  'Pennagaram Road, Dharmapuri, Tamil Nadu',
//  '333344445555', 'LMNOP4321K', 'Canara Bank', '34567890123', 'CNRB0004567',
//  'Selvam', '9100000103', 'Brother', 'active'),

// ('EMP104', 'Divya M', 'divya.m@dheeran.com', '9100000004', '1998-11-10', 'female',
//  'Bharathipuram, Dharmapuri, Tamil Nadu',
//  '444455556666', 'ZXCVB6789P', 'HDFC Bank', '45678901234', 'HDFC0001234',
//  'Mani', '9100000104', 'Father', 'active'),

// ('EMP105', 'Vignesh K', 'vignesh.k@dheeran.com', '9100000005', '1992-01-05', 'male',
//  'Harur Road, Dharmapuri, Tamil Nadu',
//  '555566667777', 'ASDFG9876Q', 'ICICI Bank', '56789012345', 'ICIC0005678',
//  'Kannan', '9100000105', 'Father', 'active');

 export const seedEmployees = async (db) => {
  const employees = [
    ['EMP101','Arun Kumar','arun.kumar@dheeran.com','9100000001','1995-05-12','male','Nethaji Bye Pass Road, Dharmapuri, Tamil Nadu','111122223333','ABCDE1234F','State Bank of India','12345678901','SBIN0001234','Kumar','9100000101','Father','active'],

    ['EMP102','Priya R','priya.r@dheeran.com','9100000002','1997-08-25','female','Salem Main Road, Dharmapuri, Tamil Nadu','222233334444','PQRSX5678L','Indian Bank','23456789012','IDIB000D001','Ravi','9100000102','Father','active'],

    ['EMP103','Karthik S','karthik.s@dheeran.com','9100000003','1993-02-18','male','Pennagaram Road, Dharmapuri, Tamil Nadu','333344445555','LMNOP4321K','Canara Bank','34567890123','CNRB0004567','Selvam','9100000103','Brother','active'],

    ['EMP104','Divya M','divya.m@dheeran.com','9100000004','1998-11-10','female','Bharathipuram, Dharmapuri, Tamil Nadu','444455556666','ZXCVB6789P','HDFC Bank','45678901234','HDFC0001234','Mani','9100000104','Father','active'],

    ['EMP105','Vignesh K','vignesh.k@dheeran.com','9100000005','1992-01-05','male','Harur Road, Dharmapuri, Tamil Nadu','555566667777','ASDFG9876Q','ICICI Bank','56789012345','ICIC0005678','Kannan','9100000105','Father','active'],
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

