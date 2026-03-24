export const createCategoriesTable = async (db) => {
    await db.query(`
  CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  hsn_code VARCHAR(20),

  CONSTRAINT fk_categories_brand
    FOREIGN KEY (brand_id)
    REFERENCES brands(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  UNIQUE KEY uq_brand_category (brand_id, name)
  ) ENGINE=InnoDB
`);
};