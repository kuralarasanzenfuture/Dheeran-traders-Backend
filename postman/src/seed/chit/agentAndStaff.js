// INSERT INTO chit_agent_and_staff 
// (name, phone, reference_mode, no_of_referals, status, created_by, updated_by)
// VALUES

// ('Selvam Agent', '9300000001', 'AGENT', 12, 'active', NULL, NULL),
// ('Kumar Staff', '9300000002', 'STAFF', 5, 'active', NULL, NULL);

export const seedChitAgentStaff = async (db) => {
  const data = [
    ['Selvam Agent', '9300000001', 'AGENT', 12, 'active', null, null],
    ['Kumar Staff', '9300000002', 'STAFF', 5, 'active', null, null],
  ];

  for (const item of data) {
    await db.query(
      `INSERT IGNORE INTO chit_agent_and_staff 
      (name, phone, reference_mode, no_of_referals, status, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      item
    );
  }
};
