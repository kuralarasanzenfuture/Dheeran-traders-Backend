export const createChitCustomerTable = async (db) => {
  // await db.query(`
  //       CREATE TABLE IF NOT EXISTS chit_customers (
  //           id INT PRIMARY KEY AUTO_INCREMENT,
  //           name VARCHAR(100) NOT NULL,
  //           phone VARCHAR(20) NOT NULL UNIQUE,
  //           place VARCHAR(100),
  //           aadhar VARCHAR(12) UNIQUE,
  //           pan_number VARCHAR(10) UNIQUE,
  //           door_no VARCHAR(10),
  //           address TEXT,
  //           state VARCHAR(100),
  //           district VARCHAR(100),
  //           pincode VARCHAR(10),

  //           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  //       )
  //   `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS chit_customers (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,

    place VARCHAR(100),

    aadhar VARCHAR(12) UNIQUE,
    pan_number VARCHAR(10) UNIQUE,

    door_no VARCHAR(20),
    address TEXT,

    state VARCHAR(100),
    district VARCHAR(100),
    pincode VARCHAR(10),

    created_by INT NULL,
    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- ✅ Proper constraints
    UNIQUE KEY unique_phone (phone),
    UNIQUE KEY unique_aadhar (aadhar),
    UNIQUE KEY unique_pan (pan_number),

    -- ✅ Indexes for search performance
    INDEX idx_name (name),
    INDEX idx_phone (phone),
    INDEX idx_aadhar (aadhar),
    INDEX idx_pan (pan_number),
    INDEX idx_location (state, district, pincode)
);
    `);

  await seedChitCustomers(db);

  //   await db.query(`
  //     INSERT IGNORE INTO chit_customers (
  //     name, phone, place, aadhar, pan_number, door_no, address, state, district, pincode
  // ) VALUES
  // (
  //     'Ramesh Kumar',
  //     '9876543210',
  //     'Dharmapuri',
  //     '123456789012',
  //     'ABCDE1234F',
  //     '12A',
  //     'Near Bus Stand, Pennagaram Road',
  //     'Tamil Nadu',
  //     'Dharmapuri',
  //     '636701'
  // ),
  // (
  //     'Priya Lakshmi',
  //     '9123456789',
  //     'Dharmapuri',
  //     '987654321098',
  //     'PQRSX5678L',
  //     '45B',
  //     'Nethaji Nagar, Salem Main Road',
  //     'Tamil Nadu',
  //     'Dharmapuri',
  //     '636705'
  // );
  //     `);
};

const seedChitCustomers = async (db) => {
  const customers = [
    [
      "Arun Kumar",
      "9000010001",
      "Dharmapuri",
      "123412341001",
      "ABCDE1001F",
      "12A",
      "Nethaji Bye Pass Road",
      "Tamil Nadu",
      "Dharmapuri",
      "636701",
    ],
    [
      "Priya Raman",
      "9000010002",
      "Dharmapuri",
      "123412341002",
      "ABCDE1002F",
      "34B",
      "Salem Main Road",
      "Tamil Nadu",
      "Dharmapuri",
      "636701",
    ],
    [
      "Karthik Raj",
      "9000010003",
      "Pennagaram",
      "123412341003",
      "ABCDE1003F",
      "22C",
      "Pennagaram Road",
      "Tamil Nadu",
      "Dharmapuri",
      "636810",
    ],
    [
      "Divya Shankar",
      "9000010004",
      "Dharmapuri",
      "123412341004",
      "ABCDE1004F",
      "11D",
      "Bharathipuram",
      "Tamil Nadu",
      "Dharmapuri",
      "636705",
    ],
    [
      "Vignesh M",
      "9000010005",
      "Harur",
      "123412341005",
      "ABCDE1005F",
      "9E",
      "Harur Main Road",
      "Tamil Nadu",
      "Dharmapuri",
      "636903",
    ],

    [
      "Sangeetha R",
      "9000010006",
      "Palacode",
      "123412341006",
      "ABCDE1006F",
      "5F",
      "Palacode Bazaar",
      "Tamil Nadu",
      "Dharmapuri",
      "636808",
    ],
    [
      "Manoj Kumar",
      "9000010007",
      "Karimangalam",
      "123412341007",
      "ABCDE1007F",
      "7G",
      "Karimangalam Town",
      "Tamil Nadu",
      "Dharmapuri",
      "635111",
    ],
    [
      "Lakshmi Devi",
      "9000010008",
      "Nallampalli",
      "123412341008",
      "ABCDE1008F",
      "3H",
      "Nallampalli Road",
      "Tamil Nadu",
      "Dharmapuri",
      "636807",
    ],
    [
      "Prakash S",
      "9000010009",
      "Pappireddipatti",
      "123412341009",
      "ABCDE1009F",
      "18I",
      "Pappireddipatti Main",
      "Tamil Nadu",
      "Dharmapuri",
      "636905",
    ],
    [
      "Meena K",
      "9000010010",
      "Morappur",
      "123412341010",
      "ABCDE1010F",
      "2J",
      "Morappur Bus Stand",
      "Tamil Nadu",
      "Dharmapuri",
      "635305",
    ],

    [
      "Murugan P",
      "9000010011",
      "Dharmapuri",
      "123412341011",
      "ABCDE1011F",
      "45K",
      "Collector Office Road",
      "Tamil Nadu",
      "Dharmapuri",
      "636701",
    ],
    [
      "Anitha R",
      "9000010012",
      "Dharmapuri",
      "123412341012",
      "ABCDE1012F",
      "16L",
      "Four Roads Junction",
      "Tamil Nadu",
      "Dharmapuri",
      "636701",
    ],
    [
      "Selvam T",
      "9000010013",
      "Harur",
      "123412341013",
      "ABCDE1013F",
      "28M",
      "Harur Market Area",
      "Tamil Nadu",
      "Dharmapuri",
      "636903",
    ],
    [
      "Revathi S",
      "9000010014",
      "Palacode",
      "123412341014",
      "ABCDE1014F",
      "19N",
      "Palacode Main Street",
      "Tamil Nadu",
      "Dharmapuri",
      "636808",
    ],
    [
      "Gopinath V",
      "9000010015",
      "Pennagaram",
      "123412341015",
      "ABCDE1015F",
      "6O",
      "Pennagaram Bus Stand",
      "Tamil Nadu",
      "Dharmapuri",
      "636810",
    ],

    [
      "Kavitha M",
      "9000010016",
      "Karimangalam",
      "123412341016",
      "ABCDE1016F",
      "10P",
      "Karimangalam Colony",
      "Tamil Nadu",
      "Dharmapuri",
      "635111",
    ],
    [
      "Ravi Kumar",
      "9000010017",
      "Nallampalli",
      "123412341017",
      "ABCDE1017F",
      "8Q",
      "Nallampalli Center",
      "Tamil Nadu",
      "Dharmapuri",
      "636807",
    ],
    [
      "Deepa L",
      "9000010018",
      "Pappireddipatti",
      "123412341018",
      "ABCDE1018F",
      "14R",
      "Pappireddipatti Bazaar",
      "Tamil Nadu",
      "Dharmapuri",
      "636905",
    ],
    [
      "Sathish B",
      "9000010019",
      "Morappur",
      "123412341019",
      "ABCDE1019F",
      "21S",
      "Morappur Main Road",
      "Tamil Nadu",
      "Dharmapuri",
      "635305",
    ],
    [
      "Nirmala D",
      "9000010020",
      "Dharmapuri",
      "123412341020",
      "ABCDE1020F",
      "30T",
      "Old Bus Stand Area",
      "Tamil Nadu",
      "Dharmapuri",
      "636701",
    ],
  ];

  for (const c of customers) {
    await db.query(
      `INSERT IGNORE INTO chit_customers
      (name, phone, place, aadhar, pan_number, door_no, address, state, district, pincode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      c,
    );
  }
};

// INSERT INTO chit_customers
// (name, phone, place, aadhar, pan_number, door_no, address, state, district, pincode)
// VALUES

// ('Arun Kumar', '9000010001', 'Dharmapuri', '123412341001', 'ABCDE1001F', '12A', 'Nethaji Bye Pass Road', 'Tamil Nadu', 'Dharmapuri', '636701'),
// ('Priya Raman', '9000010002', 'Dharmapuri', '123412341002', 'ABCDE1002F', '34B', 'Salem Main Road', 'Tamil Nadu', 'Dharmapuri', '636701'),
// ('Karthik Raj', '9000010003', 'Pennagaram', '123412341003', 'ABCDE1003F', '22C', 'Pennagaram Road', 'Tamil Nadu', 'Dharmapuri', '636810'),
// ('Divya Shankar', '9000010004', 'Dharmapuri', '123412341004', 'ABCDE1004F', '11D', 'Bharathipuram', 'Tamil Nadu', 'Dharmapuri', '636705'),
// ('Vignesh M', '9000010005', 'Harur', '123412341005', 'ABCDE1005F', '9E', 'Harur Main Road', 'Tamil Nadu', 'Dharmapuri', '636903'),

// ('Sangeetha R', '9000010006', 'Palacode', '123412341006', 'ABCDE1006F', '5F', 'Palacode Bazaar', 'Tamil Nadu', 'Dharmapuri', '636808'),
// ('Manoj Kumar', '9000010007', 'Karimangalam', '123412341007', 'ABCDE1007F', '7G', 'Karimangalam Town', 'Tamil Nadu', 'Dharmapuri', '635111'),
// ('Lakshmi Devi', '9000010008', 'Nallampalli', '123412341008', 'ABCDE1008F', '3H', 'Nallampalli Road', 'Tamil Nadu', 'Dharmapuri', '636807'),
// ('Prakash S', '9000010009', 'Pappireddipatti', '123412341009', 'ABCDE1009F', '18I', 'Pappireddipatti Main', 'Tamil Nadu', 'Dharmapuri', '636905'),
// ('Meena K', '9000010010', 'Morappur', '123412341010', 'ABCDE1010F', '2J', 'Morappur Bus Stand', 'Tamil Nadu', 'Dharmapuri', '635305'),

// ('Murugan P', '9000010011', 'Dharmapuri', '123412341011', 'ABCDE1011F', '45K', 'Collector Office Road', 'Tamil Nadu', 'Dharmapuri', '636701'),
// ('Anitha R', '9000010012', 'Dharmapuri', '123412341012', 'ABCDE1012F', '16L', 'Four Roads Junction', 'Tamil Nadu', 'Dharmapuri', '636701'),
// ('Selvam T', '9000010013', 'Harur', '123412341013', 'ABCDE1013F', '28M', 'Harur Market Area', 'Tamil Nadu', 'Dharmapuri', '636903'),
// ('Revathi S', '9000010014', 'Palacode', '123412341014', 'ABCDE1014F', '19N', 'Palacode Main Street', 'Tamil Nadu', 'Dharmapuri', '636808'),
// ('Gopinath V', '9000010015', 'Pennagaram', '123412341015', 'ABCDE1015F', '6O', 'Pennagaram Bus Stand', 'Tamil Nadu', 'Dharmapuri', '636810'),

// ('Kavitha M', '9000010016', 'Karimangalam', '123412341016', 'ABCDE1016F', '10P', 'Karimangalam Colony', 'Tamil Nadu', 'Dharmapuri', '635111'),
// ('Ravi Kumar', '9000010017', 'Nallampalli', '123412341017', 'ABCDE1017F', '8Q', 'Nallampalli Center', 'Tamil Nadu', 'Dharmapuri', '636807'),
// ('Deepa L', '9000010018', 'Pappireddipatti', '123412341018', 'ABCDE1018F', '14R', 'Pappireddipatti Bazaar', 'Tamil Nadu', 'Dharmapuri', '636905'),
// ('Sathish B', '9000010019', 'Morappur', '123412341019', 'ABCDE1019F', '21S', 'Morappur Main Road', 'Tamil Nadu', 'Dharmapuri', '635305'),
// ('Nirmala D', '9000010020', 'Dharmapuri', '123412341020', 'ABCDE1020F', '30T', 'Old Bus Stand Area', 'Tamil Nadu', 'Dharmapuri', '636701');
