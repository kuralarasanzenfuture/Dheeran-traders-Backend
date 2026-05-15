export const createTermsAndConditionsTable = async (db) => {
  await db.query(`
        CREATE TABLE IF NOT EXISTS terms (
  id INT AUTO_INCREMENT PRIMARY KEY,

  version VARCHAR(20) NOT NULL,   -- v1, v2, etc
  title VARCHAR(255),

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_terms_version (version)
);
    `);

  await db.query(`
        CREATE TABLE IF NOT EXISTS terms_points (
  id INT AUTO_INCREMENT PRIMARY KEY,

  terms_id INT NOT NULL,

  point_order INT NOT NULL,       -- display order
  content TEXT NOT NULL,          -- actual condition

  is_mandatory BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (terms_id) REFERENCES terms(id) ON DELETE CASCADE,

  INDEX idx_terms (terms_id),

  UNIQUE KEY uq_terms_point_order (terms_id, point_order)
);
    `);

  await db.query(`
        CREATE TABLE IF NOT EXISTS user_terms_acceptance (
  id INT AUTO_INCREMENT PRIMARY KEY,

  user_id INT NOT NULL,
  terms_id INT NOT NULL,

  accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  ip_address VARCHAR(50),
  user_agent TEXT,

  UNIQUE KEY uq_user_terms (user_id, terms_id),

  FOREIGN KEY (user_id) REFERENCES users_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (terms_id) REFERENCES terms(id) ON DELETE CASCADE
);
    `);
};
