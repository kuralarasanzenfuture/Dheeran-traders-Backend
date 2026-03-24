export const createQuantityTable = async (db) => {
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