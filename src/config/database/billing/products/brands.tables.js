export const createBrandsTable = async (db) => {
  await db.query(`
  CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE

  ) ENGINE=InnoDB
`);
};
