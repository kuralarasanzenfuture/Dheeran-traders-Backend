export const monthlyInvestmentTables = async (db) => {
  await db.query(`
  CREATE TABLE IF NOT EXISTS monthly_investment_plans (

    id INT AUTO_INCREMENT PRIMARY KEY,

    -- =========================================
    -- PLAN DETAILS
    -- =========================================

    plan_name VARCHAR(150) NOT NULL,
    plan_code VARCHAR(50) NOT NULL,

    description TEXT NULL,

    -- =========================================
    -- PLAN PERIOD
    -- =========================================

    plan_start_date DATE NOT NULL,
    plan_end_date DATE NOT NULL,

    -- =========================================
    -- INTEREST
    -- =========================================

    interest_frequency ENUM(
      'MONTHLY'
    ) NOT NULL DEFAULT 'MONTHLY',

    -- Interest is calculated after each
    -- completed monthly period.
    interest_calculation ENUM(
      'MONTHLY_PERIOD'
    ) NOT NULL DEFAULT 'MONTHLY_PERIOD',

    -- =========================================
    -- FINAL PAYOUT
    -- =========================================

    final_payout_type ENUM(
      'INTEREST_PLUS_PRINCIPAL'
    ) NOT NULL DEFAULT 'INTEREST_PLUS_PRINCIPAL',

    interest_payment_days VARCHAR(50) NOT NULL DEFAULT '1, 5, 10, 15, 20, 25, 30',

    -- =========================================
    -- STATUS
    -- =========================================

    status ENUM(
      'DRAFT',
      'ACTIVE',
      'CLOSED',
      'INACTIVE'
    ) NOT NULL DEFAULT 'DRAFT',

    -- =========================================
    -- AUDIT
    -- =========================================

    created_by INT NULL,
    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,

    -- =========================================
    -- UNIQUE
    -- =========================================

    UNIQUE KEY uq_monthly_investment_plan_code (
      plan_code
    ),

    UNIQUE KEY uq_monthly_investment_plan_name (
      plan_name
    ),

    -- =========================================
    -- INDEXES
    -- =========================================

    INDEX idx_mip_start_date (
      plan_start_date
    ),

    INDEX idx_mip_end_date (
      plan_end_date
    ),

    INDEX idx_mip_status (
      status
    ),

    -- =========================================
    -- VALIDATION
    -- =========================================

    CHECK (
      plan_end_date >= plan_start_date
    )

  ) ENGINE=InnoDB;
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS monthly_investment_plan_amounts (

    id INT AUTO_INCREMENT PRIMARY KEY,

    -- =========================================
    -- PLAN
    -- =========================================

    plan_id INT NOT NULL,

    -- =========================================
    -- PRINCIPAL
    -- =========================================

    principal_amount DECIMAL(14,2) NOT NULL,

    -- =========================================
    -- MONTHLY INTEREST RANGE
    -- =========================================

    minimum_monthly_interest DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    maximum_monthly_interest DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    -- =========================================
    -- STATUS
    -- =========================================

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- =========================================
    -- AUDIT
    -- =========================================

    created_by INT NULL,
    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,

    -- =========================================
    -- FOREIGN KEY
    -- =========================================

    CONSTRAINT fk_mip_amount_plan
      FOREIGN KEY (plan_id)
      REFERENCES monthly_investment_plans(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    -- =========================================
    -- UNIQUE
    -- =========================================

    UNIQUE KEY uq_mip_plan_principal (
      plan_id,
      principal_amount
    ),

    -- =========================================
    -- INDEXES
    -- =========================================

    INDEX idx_mipa_plan (
      plan_id
    ),

    INDEX idx_mipa_principal (
      principal_amount
    ),

    INDEX idx_mipa_active (
      plan_id,
      is_active
    ),

    -- =========================================
    -- VALIDATION
    -- =========================================

    CHECK (
      principal_amount > 0
    ),

    CHECK (
      minimum_monthly_interest >= 0
    ),

    CHECK (
      maximum_monthly_interest >=
      minimum_monthly_interest
    )

  ) ENGINE=InnoDB;
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS monthly_investment_subscriptions (

    id INT AUTO_INCREMENT PRIMARY KEY,

    -- =========================================
    -- SUBSCRIPTION NUMBER
    -- =========================================

    subscription_no VARCHAR(50) NOT NULL,

    -- =========================================
    -- CUSTOMER
    -- =========================================

    customer_id INT NOT NULL,

    -- =========================================
    -- PLAN
    -- =========================================

    plan_id INT NOT NULL,

    plan_amount_id INT NOT NULL,

    -- =========================================
    -- QUANTITY
    -- =========================================

    quantity INT NOT NULL DEFAULT 1,

    -- =========================================
    -- PRINCIPAL - PER QUANTITY
    -- =========================================

    principal_amount_per_quantity DECIMAL(14,2)
      NOT NULL,

    -- =========================================
    -- PRINCIPAL - TOTAL
    -- =========================================

    total_principal_amount DECIMAL(14,2)
      NOT NULL,

    -- =========================================
    -- MONTHLY INTEREST - PER QUANTITY
    -- =========================================

    monthly_interest_amount_per_quantity DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    -- =========================================
    -- MONTHLY INTEREST - TOTAL
    -- =========================================

    total_monthly_interest_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    -- =========================================
    -- SUBSCRIPTION PERIOD
    -- =========================================

    subscription_start_date DATE NOT NULL,

    subscription_end_date DATE NOT NULL,

    -- =========================================
    -- INTEREST PERIOD
    -- =========================================

    first_interest_due_date DATE NOT NULL,

    next_interest_due_date DATE NULL,

    -- =========================================
    -- INTEREST MONTHS
    -- =========================================

    total_interest_months INT NOT NULL,

    completed_interest_months INT
      NOT NULL DEFAULT 0,

    pending_interest_months INT
      NOT NULL DEFAULT 0,

    -- =========================================
    -- TOTAL INTEREST
    -- =========================================

    total_interest_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    -- =========================================
    -- PAID INTEREST
    -- =========================================

    total_interest_paid DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    -- =========================================
    -- PENDING INTEREST
    -- =========================================

    total_interest_pending DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    -- =========================================
    -- PRINCIPAL PAYMENT
    -- =========================================

    principal_paid BOOLEAN NOT NULL DEFAULT FALSE,

    principal_paid_date DATE NULL,

    principal_paid_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    principal_pending_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    -- =========================================
    -- MATURITY
    -- =========================================

    maturity_principal_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    maturity_interest_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    maturity_total_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    maturity_date DATE NULL,

    -- =========================================
    -- PRECLOSURE
    -- =========================================

    preclosure_date DATE NULL,

    preclosure_principal_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    preclosure_interest_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    preclosure_total_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    preclosure_reason TEXT NULL,

    -- =========================================
    -- STATUS
    -- =========================================

    status ENUM(
      'ACTIVE',
      'MATURED',
      'COMPLETED',
      'PRECLOSED',
      'CANCELLED'
    ) NOT NULL DEFAULT 'ACTIVE',

    -- =========================================
    -- COMPLETION
    -- =========================================

    completed_date DATE NULL,

    -- =========================================
    -- CANCELLATION
    -- =========================================

    cancelled_date DATE NULL,

    cancellation_reason TEXT NULL,

    -- =========================================
    -- AUDIT
    -- =========================================

    created_by INT NULL,

    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,

    -- =========================================
    -- FOREIGN KEYS
    -- =========================================

    CONSTRAINT fk_mis_customer
      FOREIGN KEY (customer_id)
      REFERENCES chit_customers(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    CONSTRAINT fk_mis_plan
      FOREIGN KEY (plan_id)
      REFERENCES monthly_investment_plans(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    CONSTRAINT fk_mis_plan_amount
      FOREIGN KEY (plan_amount_id)
      REFERENCES monthly_investment_plan_amounts(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    -- =========================================
    -- UNIQUE
    -- =========================================

    UNIQUE KEY uq_mis_subscription_no (
      subscription_no
    ),

    -- =========================================
    -- INDEXES
    -- =========================================

    INDEX idx_mis_customer (
      customer_id
    ),

    INDEX idx_mis_plan (
      plan_id
    ),

    INDEX idx_mis_plan_amount (
      plan_amount_id
    ),

    INDEX idx_mis_start_date (
      subscription_start_date
    ),

    INDEX idx_mis_end_date (
      subscription_end_date
    ),

    INDEX idx_mis_next_interest (
      next_interest_due_date
    ),

    INDEX idx_mis_status (
      status
    ),

    INDEX idx_mis_principal_paid (
      principal_paid
    ),

    -- =========================================
    -- VALIDATION
    -- =========================================

    CHECK (
      quantity > 0
    ),

    CHECK (
      principal_amount_per_quantity > 0
    ),

    CHECK (
      total_principal_amount > 0
    ),

    CHECK (
      monthly_interest_amount_per_quantity >= 0
    ),

    CHECK (
      total_monthly_interest_amount >= 0
    ),

    CHECK (
      subscription_end_date >= subscription_start_date
    ),

    CHECK (
      total_interest_months > 0
    ),

    CHECK (
      completed_interest_months >= 0
    ),

    CHECK (
      completed_interest_months <= total_interest_months
    ),

    CHECK (
      pending_interest_months >= 0
    ),

    CHECK (
      pending_interest_months <= total_interest_months
    ),

    CHECK (
      total_interest_amount >= 0
    ),

    CHECK (
      total_interest_paid >= 0
    ),

    CHECK (
      total_interest_pending >= 0
    ),

    CHECK (
      principal_paid_amount >= 0
    ),

    CHECK (
      principal_pending_amount >= 0
    ),

    CHECK (
      maturity_principal_amount >= 0
    ),

    CHECK (
      maturity_interest_amount >= 0
    ),

    CHECK (
      maturity_total_amount >= 0
    ),

    CHECK (
      preclosure_principal_amount >= 0
    ),

    CHECK (
      preclosure_interest_amount >= 0
    ),

    CHECK (
      preclosure_total_amount >= 0
    )

  ) ENGINE=InnoDB;
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS monthly_investment_interest_schedules (

    id INT AUTO_INCREMENT PRIMARY KEY,

    -- =========================================
    -- SUBSCRIPTION
    -- =========================================

    subscription_id INT NOT NULL,

    -- =========================================
    -- INSTALLMENT / INTEREST NUMBER
    -- =========================================

    interest_no INT NOT NULL,

    -- =========================================
    -- INTEREST PERIOD
    -- =========================================

    period_start_date DATE NOT NULL,

    period_end_date DATE NOT NULL,

    interest_due_date DATE NOT NULL,

    -- =========================================
    -- INTEREST
    -- =========================================

    interest_amount DECIMAL(14,2) NOT NULL,

    -- =========================================
    -- PAYMENT
    -- =========================================

    paid_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    pending_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    -- =========================================
    -- STATUS
    -- =========================================

    status ENUM(
      'PENDING',
      'DUE',
      'PARTIAL',
      'PAID',
      'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    paid_date DATE NULL,

    -- =========================================
    -- PAYMENT REFERENCE
    -- =========================================

    payment_id INT NULL,

    payment_mode ENUM(
      'CASH',
      'UPI',
      'BANK',
      'CHEQUE'
    ) NULL,

    transaction_reference VARCHAR(255) NULL,

    remarks TEXT NULL,

    -- =========================================
    -- AUDIT
    -- =========================================

    created_by INT NULL,
    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,

    -- =========================================
    -- FOREIGN KEY
    -- =========================================

    CONSTRAINT fk_miis_subscription
      FOREIGN KEY (subscription_id)
      REFERENCES monthly_investment_subscriptions(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE,

    -- =========================================
    -- UNIQUE
    -- =========================================

    UNIQUE KEY uq_miis_subscription_interest_no (
      subscription_id,
      interest_no
    ),

    UNIQUE KEY uq_miis_subscription_due_date (
      subscription_id,
      interest_due_date
    ),

    -- =========================================
    -- INDEXES
    -- =========================================

    INDEX idx_miis_subscription (
      subscription_id
    ),

    INDEX idx_miis_due_date (
      interest_due_date
    ),

    INDEX idx_miis_status (
      status
    ),

    INDEX idx_miis_due_status (
      interest_due_date,
      status
    ),

    INDEX idx_miis_subscription_status (
      subscription_id,
      status
    ),

    -- =========================================
    -- VALIDATION
    -- =========================================

    CHECK (
      interest_no > 0
    ),

    CHECK (
      interest_amount >= 0
    ),

    CHECK (
      paid_amount >= 0
    ),

    CHECK (
      pending_amount >= 0
    ),

    CHECK (
      period_end_date >= period_start_date
    )

  ) ENGINE=InnoDB;
`);
  await db.query(`
  CREATE TABLE IF NOT EXISTS monthly_investment_payments (

    id INT AUTO_INCREMENT PRIMARY KEY,

    -- =========================================
    -- SUBSCRIPTION
    -- =========================================

    subscription_id INT NOT NULL,

    customer_id INT NOT NULL,

    -- =========================================
    -- PAYMENT TYPE
    -- =========================================

    payment_type ENUM(
      'PRINCIPAL_RECEIPT',
      'INTEREST',
      'PRINCIPAL',
      'INTEREST_AND_PRINCIPAL',
      'PRECLOSURE'
    ) NOT NULL,

    -- =========================================
    -- INTEREST SCHEDULE
    -- =========================================

    interest_schedule_id INT NULL,

    -- =========================================
    -- AMOUNTS
    -- =========================================

    interest_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    principal_amount DECIMAL(14,2)
      NOT NULL DEFAULT 0.00,

    total_amount DECIMAL(14,2) NOT NULL,

    -- =========================================
    -- PAYMENT DATE
    -- =========================================

    payment_date DATETIME NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    -- =========================================
    -- PAYMENT MODE
    -- =========================================

    payment_mode ENUM(
      'CASH',
      'UPI',
      'BANK',
      'CHEQUE'
    ) NOT NULL,

    transaction_reference VARCHAR(255) NULL,

    -- =========================================
    -- DETAILS
    -- =========================================

    remarks TEXT NULL,

    -- =========================================
    -- AUDIT
    -- =========================================

    paid_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,

    -- =========================================
    -- FOREIGN KEYS
    -- =========================================

    CONSTRAINT fk_mip_payment_subscription
      FOREIGN KEY (subscription_id)
      REFERENCES monthly_investment_subscriptions(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    CONSTRAINT fk_mip_payment_customer
      FOREIGN KEY (customer_id)
      REFERENCES chit_customers(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    CONSTRAINT fk_mip_payment_interest_schedule
      FOREIGN KEY (interest_schedule_id)
      REFERENCES monthly_investment_interest_schedules(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    CONSTRAINT fk_mip_payment_user
      FOREIGN KEY (paid_by)
      REFERENCES users_roles(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    -- =========================================
    -- INDEXES
    -- =========================================

    INDEX idx_mip_payment_subscription (
      subscription_id
    ),

    INDEX idx_mip_payment_customer (
      customer_id
    ),

    INDEX idx_mip_payment_type (
      payment_type
    ),

    INDEX idx_mip_payment_date (
      payment_date
    ),

    INDEX idx_mip_payment_schedule (
      interest_schedule_id
    ),

    INDEX idx_mip_payment_user (
      paid_by
    ),

    INDEX idx_mip_payment_reference (
      transaction_reference
    ),

    -- =========================================
    -- VALIDATION
    -- =========================================

    CHECK (
      interest_amount >= 0
    ),

    CHECK (
      principal_amount >= 0
    ),

    CHECK (
      total_amount > 0
    )

  ) ENGINE=InnoDB;
`);

  // Safe check for interest_payment_days column in monthly_investment_plans
  try {
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'monthly_investment_plans' 
         AND COLUMN_NAME = 'interest_payment_days'`
    );
    if (!cols.length) {
      await db.query(
        `ALTER TABLE monthly_investment_plans 
         ADD COLUMN interest_payment_days VARCHAR(50) NOT NULL DEFAULT '1, 5, 10, 15, 20, 25, 30' 
         AFTER final_payout_type`
      );
    }
  } catch (err) {
    console.error("Migration notice for monthly_investment_plans.interest_payment_days:", err.message);
  }
};

