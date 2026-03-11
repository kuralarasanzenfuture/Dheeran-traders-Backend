export const createRefeshTokensTable = async (db) => {
  //     Purpose:
  // logout → delete token
  // token theft → revoke token
  // multiple devices → track tokens
//   await db.query(`
//               CREATE TABLE IF NOT EXISTS refresh_tokens (
//                   id INT AUTO_INCREMENT PRIMARY KEY,
//                   user_id INT NOT NULL,
//                   token VARCHAR(500) NOT NULL,
//                   expires_at DATETIME,
//                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//                   FOREIGN KEY (user_id) REFERENCES users_roles(id) ON DELETE CASCADE
//               )
//               `);

            //   Refresh Token Storage

  await db.query(`
                CREATE TABLE IF NOT EXISTS user_refresh_tokens (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    refresh_token TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    revoked BOOLEAN DEFAULT FALSE,
                    
                    FOREIGN KEY (user_id) REFERENCES users_roles(id) ON DELETE CASCADE
                )
                `);

                // Login Attempt Blocking
};
