export const createInvestmentTables = async (db) => {
  await db.query(`
  CREATE TABLE IF NOT EXISTS investment_plans (

    id INT AUTO_INCREMENT PRIMARY KEY,

    plan_name VARCHAR(150) NOT NULL,
    plan_code VARCHAR(50) NOT NULL,

    investment_type ENUM(
        'SINGLE'
    ) NOT NULL DEFAULT 'SINGLE',

    lock_in_days INT NOT NULL DEFAULT 106,

    interest_frequency ENUM(
        'WEEKLY'
    ) NOT NULL DEFAULT 'WEEKLY',

    payout_day ENUM(
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
        'SUNDAY'
    ) NOT NULL DEFAULT 'SATURDAY',

    interest_start_rule ENUM(
        'AFTER_LOCK_IN'
    ) NOT NULL DEFAULT 'AFTER_LOCK_IN',

    final_payout_type ENUM(
        'INTEREST_PLUS_PRINCIPAL'
    ) NOT NULL DEFAULT 'INTEREST_PLUS_PRINCIPAL',

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    description TEXT NULL,

    created_by INT NULL,
    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_investment_plan_code (
        plan_code
    ),

    UNIQUE KEY uq_investment_plan_name (
        plan_name
    ),

    INDEX idx_investment_plan_status (
        status
    ),

    CHECK (lock_in_days > 0)

) ENGINE=InnoDB;
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS investment_plan_amounts (

    id INT AUTO_INCREMENT PRIMARY KEY,

    plan_id INT NOT NULL,

    -- =========================================
    -- INVESTMENT PRINCIPAL
    -- =========================================

    principal_amount DECIMAL(14,2) NOT NULL,

    -- =========================================
    -- PROFIT / INTEREST RANGE
    -- =========================================

    minimum_interest_amount DECIMAL(14,2)
        NOT NULL DEFAULT 0.00,

    maximum_interest_amount DECIMAL(14,2)
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

    CONSTRAINT fk_investment_plan_amount_plan

        FOREIGN KEY (plan_id)
        REFERENCES investment_plans(id)

        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- =========================================
    -- UNIQUE
    -- =========================================

    UNIQUE KEY uq_investment_plan_principal (

        plan_id,
        principal_amount

    ),

    -- =========================================
    -- INDEXES
    -- =========================================

    INDEX idx_ipa_plan (
        plan_id
    ),

    INDEX idx_ipa_principal (
        principal_amount
    ),

    INDEX idx_ipa_active (
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
        minimum_interest_amount >= 0
    ),

    CHECK (
        maximum_interest_amount >= minimum_interest_amount
    )

) ENGINE=InnoDB;
`);

  await db.query(`
        CREATE TABLE IF NOT EXISTS investment_subscriptions (

    id INT AUTO_INCREMENT PRIMARY KEY,

    customer_id INT NOT NULL,

    plan_id INT NOT NULL,

    plan_amount_id INT NOT NULL,

    -- =========================================
    -- ACTUAL INVESTMENT
    -- =========================================

    principal_amount DECIMAL(14,2) NOT NULL,

    -- =========================================
    -- DATES
    -- =========================================

    investment_date DATE NOT NULL,

    lock_in_end_date DATE NOT NULL,

    interest_start_date DATE NOT NULL,

    interest_end_date DATE NULL,

    -- =========================================
    -- STATUS
    -- =========================================

    status ENUM(
        'ACTIVE',
        'INTEREST_STARTED',
        'COMPLETED',
        'PRECLOSED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'ACTIVE',

    -- =========================================
    -- PRINCIPAL
    -- =========================================

    principal_paid BOOLEAN NOT NULL DEFAULT FALSE,

    principal_paid_date DATE NULL,

    principal_paid_amount DECIMAL(14,2)
        NOT NULL DEFAULT 0.00,

    -- =========================================
    -- COMPLETION
    -- =========================================

    completed_date DATE NULL,

    -- =========================================
    -- AUDIT
    -- =========================================

    created_by INT NULL,
    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_investment_subscription_customer

        FOREIGN KEY (customer_id)
        REFERENCES chit_customers(id)

        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_investment_subscription_plan

        FOREIGN KEY (plan_id)
        REFERENCES investment_plans(id)

        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_investment_subscription_amount

        FOREIGN KEY (plan_amount_id)
        REFERENCES investment_plan_amounts(id)

        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_is_customer (
        customer_id
    ),

    INDEX idx_is_plan (
        plan_id
    ),

    INDEX idx_is_plan_amount (
        plan_amount_id
    ),

    INDEX idx_is_investment_date (
        investment_date
    ),

    INDEX idx_is_lock_in_end (
        lock_in_end_date
    ),

    INDEX idx_is_interest_start (
        interest_start_date
    ),

    INDEX idx_is_status (
        status
    ),

    INDEX idx_is_principal_paid (
        principal_paid
    ),

    CHECK (principal_amount > 0),

    CHECK (lock_in_end_date >= investment_date),

    CHECK (interest_start_date >= lock_in_end_date),

    CHECK (principal_paid_amount >= 0)

) ENGINE=InnoDB;
    `);

  await db.query(`
   CREATE TABLE IF NOT EXISTS investment_interest_schedules (

    id INT AUTO_INCREMENT PRIMARY KEY,

    subscription_id INT NOT NULL,

    -- =========================================
    -- INSTALLMENT
    -- =========================================

    installment_no INT NOT NULL,

    interest_due_date DATE NOT NULL,

    -- =========================================
    -- INTEREST
    -- =========================================

    interest_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,

    -- =========================================
    -- INTEREST STATUS
    -- =========================================

    status ENUM(
        'PENDING',
        'APPROVED',
        'PAID',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    -- =========================================
    -- PAYMENT
    -- =========================================

    paid_date DATE NULL,

    paid_amount DECIMAL(14,2)
        NOT NULL DEFAULT 0.00,

    payment_id INT NULL,

    payment_mode ENUM(
        'CASH',
        'UPI',
        'BANK',
        'CHEQUE'
    ) NULL,

    -- =========================================
    -- NOTES
    -- =========================================

    remarks TEXT NULL,

    -- =========================================
    -- WHO SET THE INTEREST
    -- =========================================

    interest_updated_by INT NULL,

    interest_updated_at DATETIME NULL,

    created_by INT NULL,
    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_interest_schedule_subscription

        FOREIGN KEY (subscription_id)
        REFERENCES investment_subscriptions(id)

        ON DELETE CASCADE
        ON UPDATE CASCADE,

    UNIQUE KEY uq_interest_subscription_installment (
        subscription_id,
        installment_no
    ),

    UNIQUE KEY uq_interest_subscription_date (
        subscription_id,
        interest_due_date
    ),

    INDEX idx_iis_subscription (
        subscription_id
    ),

    INDEX idx_iis_due_date (
        interest_due_date
    ),

    INDEX idx_iis_status (
        status
    ),

    INDEX idx_iis_pending (
        status,
        interest_due_date
    ),

    CHECK (installment_no > 0),

    CHECK (interest_amount >= 0),

    CHECK (paid_amount >= 0)

) ENGINE=InnoDB;
    `);

  await db.query(`
        CREATE TABLE IF NOT EXISTS investment_payments (

    id INT AUTO_INCREMENT PRIMARY KEY,

    subscription_id INT NOT NULL,

    customer_id INT NOT NULL,

    payment_type ENUM(
        'INTEREST',
        'PRINCIPAL',
        'INTEREST_AND_PRINCIPAL'
    ) NOT NULL,

    payment_date DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    interest_amount DECIMAL(14,2)
        NOT NULL DEFAULT 0.00,

    principal_amount DECIMAL(14,2)
        NOT NULL DEFAULT 0.00,

    total_amount DECIMAL(14,2)
        NOT NULL,

    payment_mode ENUM(
        'CASH',
        'UPI',
        'BANK',
        'CHEQUE'
    ) NOT NULL,

    transaction_reference VARCHAR(255) NULL,

    remarks TEXT NULL,

    paid_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_investment_payment_subscription

        FOREIGN KEY (subscription_id)
        REFERENCES investment_subscriptions(id)

        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_investment_payment_customer

        FOREIGN KEY (customer_id)
        REFERENCES chit_customers(id)

        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_investment_payment_user

        FOREIGN KEY (paid_by)
        REFERENCES users_roles(id)

        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_ip_subscription (
        subscription_id
    ),

    INDEX idx_ip_customer (
        customer_id
    ),

    INDEX idx_ip_payment_type (
        payment_type
    ),

    INDEX idx_ip_payment_date (
        payment_date
    ),

    INDEX idx_ip_paid_by (
        paid_by
    ),

    CHECK (interest_amount >= 0),

    CHECK (principal_amount >= 0),

    CHECK (total_amount > 0)

) ENGINE=InnoDB;
    `);
};
