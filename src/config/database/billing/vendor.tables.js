export const createVendorTables = async (db) => {
  await db.query(`
      CREATE TABLE IF NOT EXISTS vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),

  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) UNIQUE,

  address TEXT,

  bank_name VARCHAR(150),
  bank_account_number VARCHAR(30),
  bank_ifsc_code VARCHAR(20),
  bank_branch_name VARCHAR(150),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
    `);

  await seedVendors(db);
};

const seedVendors = async (db) => {
  const vendors = [
    ['Ramesh', 'Kumar', '9123456780', 'ramesh.kumar@vendor.com', 'Salem Road, Dharmapuri, Tamil Nadu', 'State Bank of India', '12345678901', 'SBIN0001234', 'Dharmapuri Branch'],
    ['Suresh', 'Babu', '9123456781', 'suresh.babu@vendor.com', 'Pennagaram Road, Dharmapuri, Tamil Nadu', 'Indian Bank', '23456789012', 'IDIB000D001', 'Dharmapuri Main'],

    ['Lakshman', 'R', '9123456782', 'lakshman.r@vendor.com', 'Harur, Dharmapuri District, Tamil Nadu', 'Canara Bank', '34567890123', 'CNRB0004567', 'Harur Branch'],
    ['Manikandan', 'S', '9123456783', 'manikandan.s@vendor.com', 'Palacode, Dharmapuri District, Tamil Nadu', 'Axis Bank', '45678901234', 'UTIB0000789', 'Palacode'],

    ['Selvi', 'M', '9123456784', 'selvi.m@vendor.com', 'Karimangalam, Dharmapuri District, Tamil Nadu', 'HDFC Bank', '56789012345', 'HDFC0001234', 'Karimangalam'],
    ['Kannan', 'G', '9123456785', 'kannan.g@vendor.com', 'Nallampalli, Dharmapuri District, Tamil Nadu', 'ICICI Bank', '67890123456', 'ICIC0005678', 'Nallampalli'],

    ['Murugan', 'P', '9123456786', 'murugan.p@vendor.com', 'Pappireddipatti, Dharmapuri District, Tamil Nadu', 'Indian Overseas Bank', '78901234567', 'IOBA0002345', 'Pappireddipatti'],
    ['Vijaya', 'Lakshmi', '9123456787', 'vijaya.lakshmi@vendor.com', 'Morappur, Dharmapuri District, Tamil Nadu', 'Union Bank of India', '89012345678', 'UBIN0003456', 'Morappur'],

    ['Prabhakaran', 'T', '9123456788', 'prabhakaran.t@vendor.com', 'Bharathipuram, Dharmapuri, Tamil Nadu', 'Bank of Baroda', '90123456789', 'BARB0DHA123', 'Dharmapuri'],
    ['Anitha', 'R', '9123456789', 'anitha.r@vendor.com', 'Nethaji Bye Pass Road, Dharmapuri, Tamil Nadu', 'Kotak Mahindra Bank', '11223344556', 'KKBK0007890', 'Dharmapuri'],
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




// INSERT INTO vendors 
// (first_name, last_name, phone, email, address, bank_name, bank_account_number, bank_ifsc_code, bank_branch_name)
// VALUES

// ('Ramesh', 'Kumar', '9123456780', 'ramesh.kumar@vendor.com', 'Salem Road, Dharmapuri, Tamil Nadu', 'State Bank of India', '12345678901', 'SBIN0001234', 'Dharmapuri Branch'),
// ('Suresh', 'Babu', '9123456781', 'suresh.babu@vendor.com', 'Pennagaram Road, Dharmapuri, Tamil Nadu', 'Indian Bank', '23456789012', 'IDIB000D001', 'Dharmapuri Main'),

// ('Lakshman', 'R', '9123456782', 'lakshman.r@vendor.com', 'Harur, Dharmapuri District, Tamil Nadu', 'Canara Bank', '34567890123', 'CNRB0004567', 'Harur Branch'),
// ('Manikandan', 'S', '9123456783', 'manikandan.s@vendor.com', 'Palacode, Dharmapuri District, Tamil Nadu', 'Axis Bank', '45678901234', 'UTIB0000789', 'Palacode'),

// ('Selvi', 'M', '9123456784', 'selvi.m@vendor.com', 'Karimangalam, Dharmapuri District, Tamil Nadu', 'HDFC Bank', '56789012345', 'HDFC0001234', 'Karimangalam'),
// ('Kannan', 'G', '9123456785', 'kannan.g@vendor.com', 'Nallampalli, Dharmapuri District, Tamil Nadu', 'ICICI Bank', '67890123456', 'ICIC0005678', 'Nallampalli'),

// ('Murugan', 'P', '9123456786', 'murugan.p@vendor.com', 'Pappireddipatti, Dharmapuri District, Tamil Nadu', 'Indian Overseas Bank', '78901234567', 'IOBA0002345', 'Pappireddipatti'),
// ('Vijaya', 'Lakshmi', '9123456787', 'vijaya.lakshmi@vendor.com', 'Morappur, Dharmapuri District, Tamil Nadu', 'Union Bank of India', '89012345678', 'UBIN0003456', 'Morappur'),

// ('Prabhakaran', 'T', '9123456788', 'prabhakaran.t@vendor.com', 'Bharathipuram, Dharmapuri, Tamil Nadu', 'Bank of Baroda', '90123456789', 'BARB0DHA123', 'Dharmapuri'),
// ('Anitha', 'R', '9123456789', 'anitha.r@vendor.com', 'Nethaji Bye Pass Road, Dharmapuri, Tamil Nadu', 'Kotak Mahindra Bank', '11223344556', 'KKBK0007890', 'Dharmapuri');
