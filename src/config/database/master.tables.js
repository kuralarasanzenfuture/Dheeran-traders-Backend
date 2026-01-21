export const createMasterTables = async (db) => {
  // await db.query(`
  //   CREATE TABLE IF NOT EXISTS brands (
  //     id INT AUTO_INCREMENT PRIMARY KEY,
  //     name VARCHAR(100) NOT NULL UNIQUE
  //   ) ENGINE=InnoDB
  // `);

  // await db.query(`
  //   CREATE TABLE IF NOT EXISTS categories (
  //     id INT AUTO_INCREMENT PRIMARY KEY,
  //     brand_id INT NOT NULL,
  //     name VARCHAR(100) NOT NULL,
  //     FOREIGN KEY (brand_id) REFERENCES brands(id)
  //     ON DELETE CASCADE ON UPDATE CASCADE,
  //     UNIQUE KEY uq_brand_category (brand_id, name)
  //   ) ENGINE=InnoDB
  // `);

  // await db.query(`
  //   CREATE TABLE IF NOT EXISTS quantities (
  //     id INT AUTO_INCREMENT PRIMARY KEY,
  //     brand_id INT NOT NULL,
  //     category_id INT NOT NULL,
  //     name VARCHAR(50) NOT NULL,
  //     FOREIGN KEY (brand_id) REFERENCES brands(id),
  //     FOREIGN KEY (category_id) REFERENCES categories(id),
  //     UNIQUE (brand_id, category_id, name)
  //   ) ENGINE=InnoDB
  // `);

  // 7️⃣ BRANDS TABLE
  await db.query(`
  CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE

  ) ENGINE=InnoDB
`);

  // 8️⃣ CATEGORIES TABLE
  await db.query(`
  CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,

  CONSTRAINT fk_categories_brand
    FOREIGN KEY (brand_id)
    REFERENCES brands(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  UNIQUE KEY uq_brand_category (brand_id, name)
  ) ENGINE=InnoDB
`);

  // QUANTITY TABLE
  await db.query(`
  CREATE TABLE IF NOT EXISTS quantities (
    id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  category_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,

  CONSTRAINT fk_quantities_brand
    FOREIGN KEY (brand_id)
    REFERENCES brands(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_quantities_category
    FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  UNIQUE (brand_id, category_id, name)
  ) ENGINE=InnoDB
`);
};
