// INSERT INTO vendors 
// (first_name, last_name, phone, email, address, bank_name, bank_account_number, bank_ifsc_code, bank_branch_name)
// VALUES

// ('Murugan', 'Traders', '9000200001', 'murugan.traders@gmail.com',
//  'Rice Mill Road, Dharmapuri, Tamil Nadu',
//  'State Bank of India', '111122223333', 'SBIN0001234', 'Dharmapuri Branch'),

// ('Selvam', 'Agencies', '9000200002', 'selvam.agencies@gmail.com',
//  'Salem Main Road, Dharmapuri, Tamil Nadu',
//  'Indian Bank', '222233334444', 'IDIB000D001', 'Dharmapuri Main'),

// ('Ravi', 'Suppliers', '9000200003', 'ravi.suppliers@gmail.com',
//  'Pennagaram Road, Dharmapuri, Tamil Nadu',
//  'Canara Bank', '333344445555', 'CNRB0004567', 'Pennagaram Branch'),

// ('Kumar', 'Enterprises', '9000200004', 'kumar.enterprises@gmail.com',
//  'Harur Road, Dharmapuri, Tamil Nadu',
//  'HDFC Bank', '444455556666', 'HDFC0001234', 'Harur Branch'),

// ('Mani', 'Wholesale', '9000200005', 'mani.wholesale@gmail.com',
//  'Bharathipuram, Dharmapuri, Tamil Nadu',
//  'ICICI Bank', '555566667777', 'ICIC0005678', 'Dharmapuri Branch');

export const seedVendors = async (db) => {
  const vendors = [
    ['Murugan','Traders','9000200001','murugan.traders@gmail.com','Rice Mill Road, Dharmapuri, Tamil Nadu','State Bank of India','111122223333','SBIN0001234','Dharmapuri Branch'],

    ['Selvam','Agencies','9000200002','selvam.agencies@gmail.com','Salem Main Road, Dharmapuri, Tamil Nadu','Indian Bank','222233334444','IDIB000D001','Dharmapuri Main'],

    ['Ravi','Suppliers','9000200003','ravi.suppliers@gmail.com','Pennagaram Road, Dharmapuri, Tamil Nadu','Canara Bank','333344445555','CNRB0004567','Pennagaram Branch'],

    ['Kumar','Enterprises','9000200004','kumar.enterprises@gmail.com','Harur Road, Dharmapuri, Tamil Nadu','HDFC Bank','444455556666','HDFC0001234','Harur Branch'],

    ['Mani','Wholesale','9000200005','mani.wholesale@gmail.com','Bharathipuram, Dharmapuri, Tamil Nadu','ICICI Bank','555566667777','ICIC0005678','Dharmapuri Branch'],
  ];

  for (const v of vendors) {
    await db.query(
      `INSERT IGNORE INTO vendors 
      (first_name, last_name, phone, email, address, bank_name, bank_account_number, bank_ifsc_code, bank_branch_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      v
    );
  }
};
