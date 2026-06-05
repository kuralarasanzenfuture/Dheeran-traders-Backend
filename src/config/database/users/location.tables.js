export const createLocationTable = async (db) => {
  //   await db.query(`
  //         CREATE TABLE IF NOT EXISTS user_locations (
  //                 id INT AUTO_INCREMENT PRIMARY KEY,
  //                 user_id INT NOT NULL,
  //                 latitude DECIMAL(10,8) NOT NULL,
  //                 longitude DECIMAL(11,8) NOT NULL,
  //                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //                 INDEX(user_id)
  //         )
  //         `);

  //   await db.query(`
  //         CREATE TABLE IF NOT EXISTS user_locations_current  (
  //                 user_id INT PRIMARY KEY,
  //                 latitude DECIMAL(10,8),
  //                 longitude DECIMAL(11,8),
  //                 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

  //         )
  //         `);

  // Full location history
  // await db.query(`
  //   CREATE TABLE IF NOT EXISTS user_locations_history (
  //     id INT AUTO_INCREMENT PRIMARY KEY,
  //     user_id INT NOT NULL,
  //     latitude DECIMAL(10,8) NOT NULL,
  //     longitude DECIMAL(11,8) NOT NULL,
  //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //     INDEX(user_id)
  //   )
  // `);

  // Latest location (1 row per user)
  // await db.query(`
  //   CREATE TABLE IF NOT EXISTS user_locations_current (
  //     user_id INT PRIMARY KEY,
  //     latitude DECIMAL(10,8) NOT NULL,
  //     longitude DECIMAL(11,8) NOT NULL,
  //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  //   )
  // `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS user_locations_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  user_id INT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,

  speed FLOAT DEFAULT 0,
  heading FLOAT DEFAULT 0,
  accuracy FLOAT DEFAULT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_time (user_id, created_at),
  INDEX idx_created_at (created_at),

  CONSTRAINT fk_user_location_history
    FOREIGN KEY (user_id) REFERENCES users_roles(id)
    ON DELETE CASCADE
);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_locations_current (
  user_id INT PRIMARY KEY,

  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,

  speed FLOAT DEFAULT 0,
  heading FLOAT DEFAULT 0,

  is_online BOOLEAN DEFAULT TRUE,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_user_location_current
    FOREIGN KEY (user_id) REFERENCES users_roles(id)
    ON DELETE CASCADE
);
  `);
};
