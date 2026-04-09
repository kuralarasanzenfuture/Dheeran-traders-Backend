export const createCustomerTables = async (db) => {
//   await db.query(`
//       CREATE TABLE IF NOT EXISTS customers (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   first_name VARCHAR(100) NOT NULL,
//   last_name VARCHAR(100),

//   phone VARCHAR(20) NOT NULL UNIQUE,
//   email VARCHAR(150) UNIQUE,

//   address TEXT,

//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     ON UPDATE CURRENT_TIMESTAMP
// ) ENGINE=InnoDB;
//     `);

await db.query(`
  CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),

  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) UNIQUE,

  address TEXT,

  -- ✅ AUDIT LINKING (important for tracking)
  created_by INT,
  updated_by INT,

  -- ✅ TIMESTAMPS
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    ON UPDATE CURRENT_TIMESTAMP,

  -- ✅ UNIQUE CONSTRAINTS
  UNIQUE KEY uq_customers_phone (phone),
  UNIQUE KEY uq_customers_email (email),

  -- ✅ INDEXES (for performance)
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_created_by (created_by),

  -- ✅ FOREIGN KEY (optional but recommended)
  CONSTRAINT fk_customers_created_by
    FOREIGN KEY (created_by)
    REFERENCES users_roles(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT fk_customers_updated_by
    FOREIGN KEY (updated_by)
    REFERENCES users_roles(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE

) ENGINE=InnoDB;
    `);


  // await seedCustomers(db);

};


const seedCustomers = async (db) => {
  const customers = [
    ['Arun', 'Kumar', '9876543210', 'arun.kumar@gmail.com', 'Nethaji Bye Pass Road, Dharmapuri, Tamil Nadu'],
    ['Priya', 'Raman', '9876543211', 'priya.raman@gmail.com', 'Salem Main Road, Dharmapuri, Tamil Nadu'],
    ['Karthik', 'Raj', '9876543212', 'karthik.raj@gmail.com', 'Pennagaram Road, Dharmapuri, Tamil Nadu'],
    ['Divya', 'Shankar', '9876543213', 'divya.shankar@gmail.com', 'Bharathipuram, Dharmapuri, Tamil Nadu'],
    ['Vignesh', 'M', '9876543214', 'vignesh.m@gmail.com', 'Harur Road, Dharmapuri, Tamil Nadu'],

    ['Sangeetha', 'R', '9876543215', 'sangeetha.r@gmail.com', 'Palacode, Dharmapuri District, Tamil Nadu'],
    ['Manoj', 'Kumar', '9876543216', 'manoj.kumar@gmail.com', 'Karimangalam, Dharmapuri District, Tamil Nadu'],
    ['Lakshmi', 'Devi', '9876543217', 'lakshmi.devi@gmail.com', 'Nallampalli, Dharmapuri District, Tamil Nadu'],
    ['Prakash', 'S', '9876543218', 'prakash.s@gmail.com', 'Pappireddipatti, Dharmapuri District, Tamil Nadu'],
    ['Meena', 'K', '9876543219', 'meena.k@gmail.com', 'Morappur, Dharmapuri District, Tamil Nadu'],
  ];

  for (const c of customers) {
    await db.query(
      `INSERT IGNORE INTO customers 
      (first_name, last_name, phone, email, address)
      VALUES (?, ?, ?, ?, ?)`,
      c
    );
  }
};

// INSERT INTO customers 
// (first_name, last_name, phone, email, address)
// VALUES

// ('Arun', 'Kumar', '9876543210', 'arun.kumar@gmail.com', 'Nethaji Bye Pass Road, Dharmapuri, Tamil Nadu'),
// ('Priya', 'Raman', '9876543211', 'priya.raman@gmail.com', 'Salem Main Road, Dharmapuri, Tamil Nadu'),
// ('Karthik', 'Raj', '9876543212', 'karthik.raj@gmail.com', 'Pennagaram Road, Dharmapuri, Tamil Nadu'),
// ('Divya', 'Shankar', '9876543213', 'divya.shankar@gmail.com', 'Bharathipuram, Dharmapuri, Tamil Nadu'),
// ('Vignesh', 'M', '9876543214', 'vignesh.m@gmail.com', 'Harur Road, Dharmapuri, Tamil Nadu'),

// ('Sangeetha', 'R', '9876543215', 'sangeetha.r@gmail.com', 'Palacode, Dharmapuri District, Tamil Nadu'),
// ('Manoj', 'Kumar', '9876543216', 'manoj.kumar@gmail.com', 'Karimangalam, Dharmapuri District, Tamil Nadu'),
// ('Lakshmi', 'Devi', '9876543217', 'lakshmi.devi@gmail.com', 'Nallampalli, Dharmapuri District, Tamil Nadu'),
// ('Prakash', 'S', '9876543218', 'prakash.s@gmail.com', 'Pappireddipatti, Dharmapuri District, Tamil Nadu'),
// ('Meena', 'K', '9876543219', 'meena.k@gmail.com', 'Morappur, Dharmapuri District, Tamil Nadu');