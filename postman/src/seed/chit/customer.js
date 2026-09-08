// INSERT INTO chit_customers
// (name, phone, place, aadhar, pan_number, door_no, address, state, district, pincode, created_by, updated_by)
// VALUES

// ('Arun Kumar', '9400000001', 'Dharmapuri', '123412341111', 'ABCDE1111A',
//  '12A', 'Nethaji Bye Pass Road', 'Tamil Nadu', 'Dharmapuri', '636701', NULL, NULL),

// ('Priya R', '9400000002', 'Pennagaram', '123412341112', 'ABCDE1112B',
//  '34B', 'Pennagaram Main Road', 'Tamil Nadu', 'Dharmapuri', '636810', NULL, NULL),

// ('Karthik S', '9400000003', 'Harur', '123412341113', 'ABCDE1113C',
//  '22C', 'Harur Bazaar Street', 'Tamil Nadu', 'Dharmapuri', '636903', NULL, NULL),

// ('Divya M', '9400000004', 'Palacode', '123412341114', 'ABCDE1114D',
//  '9D', 'Palacode Market Road', 'Tamil Nadu', 'Dharmapuri', '636808', NULL, NULL),

// ('Vignesh K', '9400000005', 'Morappur', '123412341115', 'ABCDE1115E',
//  '5E', 'Morappur Main Road', 'Tamil Nadu', 'Dharmapuri', '635305', NULL, NULL);

export const seedChitCustomers = async (db) => {
  const data = [
    [
      "Arun Kumar",
      "9400000001",
      "Dharmapuri",
      "123412341111",
      "ABCDE1111A",
      "12A",
      "Nethaji Bye Pass Road",
      "Tamil Nadu",
      "Dharmapuri",
      "636701",
      null,
      null,
    ],

    [
      "Priya R",
      "9400000002",
      "Pennagaram",
      "123412341112",
      "ABCDE1112B",
      "34B",
      "Pennagaram Main Road",
      "Tamil Nadu",
      "Dharmapuri",
      "636810",
      null,
      null,
    ],

    [
      "Karthik S",
      "9400000003",
      "Harur",
      "123412341113",
      "ABCDE1113C",
      "22C",
      "Harur Bazaar Street",
      "Tamil Nadu",
      "Dharmapuri",
      "636903",
      null,
      null,
    ],

    [
      "Divya M",
      "9400000004",
      "Palacode",
      "123412341114",
      "ABCDE1114D",
      "9D",
      "Palacode Market Road",
      "Tamil Nadu",
      "Dharmapuri",
      "636808",
      null,
      null,
    ],

    [
      "Vignesh K",
      "9400000005",
      "Morappur",
      "123412341115",
      "ABCDE1115E",
      "5E",
      "Morappur Main Road",
      "Tamil Nadu",
      "Dharmapuri",
      "635305",
      null,
      null,
    ],
  ];

  for (const c of data) {
    await db.query(
      `INSERT IGNORE INTO chit_customers 
      (name, phone, place, aadhar, pan_number, door_no, address, state, district, pincode, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      c,
    );
  }
};
