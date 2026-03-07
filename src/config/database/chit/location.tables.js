export const createLocationTable = async (db) => {
  await db.query(`
        CREATE TABLE IF NOT EXISTS user_locations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                latitude DECIMAL(10,8) NOT NULL,
                longitude DECIMAL(11,8) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `);
};
