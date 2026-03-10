export const createLoginHistoryTables = async (db) => {
  await db.query(`
                CREATE TABLE IF NOT EXISTS login_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,

                    user_id INT NOT NULL, -- who logged in

                    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- when logged in
                    logout_time TIMESTAMP NULL, -- when logged out

                    ip_address VARCHAR(45), -- device location
                    user_agent TEXT, -- device details browser/device

                    status ENUM('LOGIN','LOGOUT') DEFAULT 'LOGIN',

                    FOREIGN KEY (user_id) REFERENCES users_roles(id) ON DELETE CASCADE
                )
                `);
};
