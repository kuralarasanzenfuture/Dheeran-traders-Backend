// INSERT INTO employees_details (
//   user_id, employee_code, employee_name, email, phone,
//   date_of_birth, gender, address,
//   aadhar_number, pan_number,
//   bank_name, bank_account_number, ifsc_code,
//   pan_card_image, aadhar_front_image, aadhar_back_image, bank_passbook_image,
//   marksheet_10_image, marksheet_12_image, college_marksheet_image,
//   emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
//   status
// ) VALUES

// (1, 'EMP201', 'Arun Kumar', 'arun.details@dheeran.com', '9200000001',
//  '1995-05-12', 'male', 'Nethaji Bye Pass Road, Dharmapuri, Tamil Nadu',
//  '111122223331', 'ABCDE1234A',
//  'State Bank of India', '12345678901', 'SBIN0001234',
//  'uploads/pan/arun.png', 'uploads/aadhar/arun_front.png', 'uploads/aadhar/arun_back.png', 'uploads/bank/arun.png',
//  'uploads/marks/10_arun.png', 'uploads/marks/12_arun.png', 'uploads/marks/college_arun.png',
//  'Kumar', '9200000101', 'Father', 'active'),

// (2, 'EMP202', 'Priya R', 'priya.details@dheeran.com', '9200000002',
//  '1997-08-25', 'female', 'Salem Main Road, Dharmapuri, Tamil Nadu',
//  '111122223332', 'ABCDE1234B',
//  'Indian Bank', '23456789012', 'IDIB000D001',
//  'uploads/pan/priya.png', 'uploads/aadhar/priya_front.png', 'uploads/aadhar/priya_back.png', 'uploads/bank/priya.png',
//  'uploads/marks/10_priya.png', 'uploads/marks/12_priya.png', 'uploads/marks/college_priya.png',
//  'Ravi', '9200000102', 'Father', 'active'),

// (3, 'EMP203', 'Karthik S', 'karthik.details@dheeran.com', '9200000003',
//  '1993-02-18', 'male', 'Pennagaram Road, Dharmapuri, Tamil Nadu',
//  '111122223333', 'ABCDE1234C',
//  'Canara Bank', '34567890123', 'CNRB0004567',
//  'uploads/pan/karthik.png', 'uploads/aadhar/karthik_front.png', 'uploads/aadhar/karthik_back.png', 'uploads/bank/karthik.png',
//  'uploads/marks/10_karthik.png', 'uploads/marks/12_karthik.png', 'uploads/marks/college_karthik.png',
//  'Selvam', '9200000103', 'Brother', 'active'),

// (4, 'EMP204', 'Divya M', 'divya.details@dheeran.com', '9200000004',
//  '1998-11-10', 'female', 'Bharathipuram, Dharmapuri, Tamil Nadu',
//  '111122223334', 'ABCDE1234D',
//  'HDFC Bank', '45678901234', 'HDFC0001234',
//  'uploads/pan/divya.png', 'uploads/aadhar/divya_front.png', 'uploads/aadhar/divya_back.png', 'uploads/bank/divya.png',
//  'uploads/marks/10_divya.png', 'uploads/marks/12_divya.png', 'uploads/marks/college_divya.png',
//  'Mani', '9200000104', 'Father', 'active'),

// (5, 'EMP205', 'Vignesh K', 'vignesh.details@dheeran.com', '9200000005',
//  '1992-01-05', 'male', 'Harur Road, Dharmapuri, Tamil Nadu',
//  '111122223335', 'ABCDE1234E',
//  'ICICI Bank', '56789012345', 'ICIC0005678',
//  'uploads/pan/vignesh.png', 'uploads/aadhar/vignesh_front.png', 'uploads/aadhar/vignesh_back.png', 'uploads/bank/vignesh.png',
//  'uploads/marks/10_vignesh.png', 'uploads/marks/12_vignesh.png', 'uploads/marks/college_vignesh.png',
//  'Kannan', '9200000105', 'Father', 'active');


export const seedEmployeeDetails = async (db) => {
  const data = [
    [1,'EMP201','Arun Kumar','arun.details@dheeran.com','9200000001','1995-05-12','male','Dharmapuri','111122223331','ABCDE1234A','State Bank of India','12345678901','SBIN0001234','uploads/pan/arun.png','uploads/aadhar/arun_front.png','uploads/aadhar/arun_back.png','uploads/bank/arun.png','uploads/marks/10_arun.png','uploads/marks/12_arun.png','uploads/marks/college_arun.png','Kumar','9200000101','Father','active'],

    [2,'EMP202','Priya R','priya.details@dheeran.com','9200000002','1997-08-25','female','Dharmapuri','111122223332','ABCDE1234B','Indian Bank','23456789012','IDIB000D001','uploads/pan/priya.png','uploads/aadhar/priya_front.png','uploads/aadhar/priya_back.png','uploads/bank/priya.png','uploads/marks/10_priya.png','uploads/marks/12_priya.png','uploads/marks/college_priya.png','Ravi','9200000102','Father','active'],

    [3,'EMP203','Karthik S','karthik.details@dheeran.com','9200000003','1993-02-18','male','Dharmapuri','111122223333','ABCDE1234C','Canara Bank','34567890123','CNRB0004567','uploads/pan/karthik.png','uploads/aadhar/karthik_front.png','uploads/aadhar/karthik_back.png','uploads/bank/karthik.png','uploads/marks/10_karthik.png','uploads/marks/12_karthik.png','uploads/marks/college_karthik.png','Selvam','9200000103','Brother','active'],

    [4,'EMP204','Divya M','divya.details@dheeran.com','9200000004','1998-11-10','female','Dharmapuri','111122223334','ABCDE1234D','HDFC Bank','45678901234','HDFC0001234','uploads/pan/divya.png','uploads/aadhar/divya_front.png','uploads/aadhar/divya_back.png','uploads/bank/divya.png','uploads/marks/10_divya.png','uploads/marks/12_divya.png','uploads/marks/college_divya.png','Mani','9200000104','Father','active'],

    [5,'EMP205','Vignesh K','vignesh.details@dheeran.com','9200000005','1992-01-05','male','Dharmapuri','111122223335','ABCDE1234E','ICICI Bank','56789012345','ICIC0005678','uploads/pan/vignesh.png','uploads/aadhar/vignesh_front.png','uploads/aadhar/vignesh_back.png','uploads/bank/vignesh.png','uploads/marks/10_vignesh.png','uploads/marks/12_vignesh.png','uploads/marks/college_vignesh.png','Kannan','9200000105','Father','active'],
  ];

  for (const emp of data) {
    await db.query(
      `INSERT IGNORE INTO employees_details (
        user_id, employee_code, employee_name, email, phone,
        date_of_birth, gender, address,
        aadhar_number, pan_number,
        bank_name, bank_account_number, ifsc_code,
        pan_card_image, aadhar_front_image, aadhar_back_image, bank_passbook_image,
        marksheet_10_image, marksheet_12_image, college_marksheet_image,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      emp
    );
  }
};
