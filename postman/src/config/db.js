// import dotenv from "dotenv";
// dotenv.config({ path: process.cwd() + "/.env" });

// import mysql from "mysql2/promise";

// const db = mysql.createPool({
//   host: process.env.DB_HOST || "localhost",
//   port: process.env.DB_PORT || 3306,
//   user: process.env.DB_USER || "root",
//   password: process.env.DB_PASSWORD || "admin",
//   database: process.env.DB_NAME || "deeran_traders",
//   waitForConnections: true,
//   connectionLimit: 10,
//   timezone: "+05:30",
//   dateStrings: true   // ✅ returns string instead of Date object

// });

// export default db;

import dotenv from "dotenv";
dotenv.config({ path: process.cwd() + "/.env" });

import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  timezone: "+05:30",
  dateStrings: true,
});

export default db;