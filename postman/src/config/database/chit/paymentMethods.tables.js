const seedPaymentMethods = async (db) => {
  await db.query(`
            INSERT INTO chit_payment_methods (name) VALUES
            ('CASH'),
            ('UPI'),
            ('CHEQUE'),
            ('CARD'),
            ('BANK_TRANSFER'),
            ('WALLET');
        `);
};

export const createPaymentMethodsTable = async (db) => {
  await db.query(`
        CREATE TABLE IF NOT EXISTS payment_methods (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) UNIQUE NOT NULL
        )
    `);

  await seedPaymentMethods(db);
};
