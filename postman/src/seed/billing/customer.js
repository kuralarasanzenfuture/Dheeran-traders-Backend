// INSERT INTO customers 
// (first_name, last_name, phone, email, address)
// VALUES

// ('Ramesh', 'Kumar', '9000100001', 'ramesh.kumar@gmail.com',
//  'Nethaji Bye Pass Road, Dharmapuri, Tamil Nadu'),

// ('Lakshmi', 'Devi', '9000100002', 'lakshmi.devi@gmail.com',
//  'Salem Main Road, Dharmapuri, Tamil Nadu'),

// ('Suresh', 'Babu', '9000100003', 'suresh.babu@gmail.com',
//  'Pennagaram Road, Dharmapuri, Tamil Nadu'),

// ('Meena', 'Rani', '9000100004', 'meena.rani@gmail.com',
//  'Bharathipuram, Dharmapuri, Tamil Nadu'),

// ('Karthik', 'Raj', '9000100005', 'karthik.raj@gmail.com',
//  'Harur Road, Dharmapuri, Tamil Nadu');

export const seedCustomers = async (db) => {
  const customers = [
    ['Ramesh','Kumar','9000100001','ramesh.kumar@gmail.com','Nethaji Bye Pass Road, Dharmapuri, Tamil Nadu'],
    ['Lakshmi','Devi','9000100002','lakshmi.devi@gmail.com','Salem Main Road, Dharmapuri, Tamil Nadu'],
    ['Suresh','Babu','9000100003','suresh.babu@gmail.com','Pennagaram Road, Dharmapuri, Tamil Nadu'],
    ['Meena','Rani','9000100004','meena.rani@gmail.com','Bharathipuram, Dharmapuri, Tamil Nadu'],
    ['Karthik','Raj','9000100005','karthik.raj@gmail.com','Harur Road, Dharmapuri, Tamil Nadu'],
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
