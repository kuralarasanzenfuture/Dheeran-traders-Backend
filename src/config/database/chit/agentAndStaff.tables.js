export const createAgentAndStaffTables = async (db) => {
    await db.query(`
                CREATE TABLE IF NOT EXISTS chit_agent_and_staff (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        phone VARCHAR(20) NOT NULL UNIQUE,
                        reference_mode VARCHAR(100) NOT NULL,
                        no_of_referals VARCHAR(100),
                        status ENUM('active','inactive') DEFAULT 'active',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
        `);
};