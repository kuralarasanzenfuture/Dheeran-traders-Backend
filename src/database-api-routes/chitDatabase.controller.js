import db from "../config/db.js";
import { createPlanTables } from "../config/database/chit/plan.tables.js";
import { createPlanRulesTables } from "../config/database/chit/planRules.tables.js";
import { createBatchTables } from "../config/database/chit/batches.tables.js";
import { createBatchPlanTables } from "../config/database/chit/batchPlans.tables.js";
import { createChitCustomerTable } from "../config/database/chit/customer.tables.js";
import { createAgentAndStaffTables } from "../config/database/chit/agentAndStaff.tables.js";
import { createCustomerSubcriptionTables } from "../config/database/chit/customerSubscription.tables.js";
import { createCustomerInstallments } from "../config/database/chit/customerInstallments.js";
import { createCollectionPaymentTables } from "../config/database/chit/collectionPayment.tables.js";
import { createUserAssignedCustomerTable } from "../config/database/chit/userAssignedCustomer.tables.js";
import { collectionTables } from "../config/database/chit/collection.tables.js";

// Ordered from dependent children to root parents for clean cascading operations
export const CHIT_TABLES_ORDERED = [
  "chit_payment_allocations",
  "chit_collections_payments",
  "chit_collections",
  "chit_customer_installments",
  "user_chit_customer_assignments",
  "chit_customer_subscriptions",
  "batch_plans",
  "plan_rules",
  "chit_customers",
  "chit_agent_and_staff",
  "batches",
  "plans",
];

// Tables holding transactional and operational data (excludes scheme & batch masters)
export const CHIT_TRANSACTIONAL_TABLES = [
  "chit_payment_allocations",
  "chit_collections_payments",
  "chit_collections",
  "chit_customer_installments",
  "user_chit_customer_assignments",
  "chit_customer_subscriptions",
  "chit_customers",
];

// Master configuration tables
export const CHIT_MASTER_TABLES = [
  "batch_plans",
  "plan_rules",
  "chit_agent_and_staff",
  "batches",
  "plans",
];

// Helper: check confirmation
const isConfirmed = (req) => {
  const confirmValue =
    req.body?.confirm ??
    req.query?.confirm ??
    req.headers["x-confirm-action"];
  return (
    confirmValue === true ||
    confirmValue === "true" ||
    confirmValue === 1 ||
    confirmValue === "1"
  );
};

/**
 * 1. GET /database-api/chit/status
 * Returns table existence, engine, and row count for all chit tables
 */
export const getChitDatabaseStatus = async (req, res, next) => {
  try {
    const dbName = process.env.DB_NAME || "deeran_traders";

    // Query information_schema for table presence and estimated rows
    const [existingTables] = await db.query(
      `SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, CREATE_TIME, UPDATE_TIME 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?)`,
      [dbName, CHIT_TABLES_ORDERED]
    );

    const existingMap = new Map();
    existingTables.forEach((t) => {
      existingMap.set(t.TABLE_NAME, t);
    });

    const tableStatuses = [];
    let totalRecords = 0;

    for (const tableName of CHIT_TABLES_ORDERED) {
      const info = existingMap.get(tableName);
      if (info) {
        // Run exact count query for precision
        try {
          const [[{ count }]] = await db.query(
            `SELECT COUNT(*) AS count FROM \`${tableName}\``
          );
          const rowCount = Number(count);
          totalRecords += rowCount;
          tableStatuses.push({
            table: tableName,
            exists: true,
            records: rowCount,
            created_at: info.CREATE_TIME,
            updated_at: info.UPDATE_TIME,
          });
        } catch {
          tableStatuses.push({
            table: tableName,
            exists: true,
            records: Number(info.TABLE_ROWS) || 0,
          });
        }
      } else {
        tableStatuses.push({
          table: tableName,
          exists: false,
          records: 0,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Chit database status fetched successfully",
      database: dbName,
      total_chit_records: totalRecords,
      total_tables: CHIT_TABLES_ORDERED.length,
      tables: tableStatuses,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 2. POST / DELETE /database-api/chit/clear-all-data
 * Clears/truncates all records from chit tables and resets auto-increment IDs to 1.
 * Preserves master tables if preserve_masters=true is passed.
 */
export const clearAllChitData = async (req, res, next) => {
  if (!isConfirmed(req)) {
    return res.status(400).json({
      success: false,
      message:
        "Confirmation required to wipe data. Provide { confirm: true } in body or ?confirm=true in query.",
    });
  }

  const preserveMasters =
    req.body?.preserve_masters === true ||
    req.body?.preserve_masters === "true" ||
    req.query?.preserve_masters === "true" ||
    req.query?.preserve_masters === "1";

  const targetTables = preserveMasters
    ? CHIT_TRANSACTIONAL_TABLES
    : CHIT_TABLES_ORDERED;

  const connection = await db.getConnection();
  const clearedTables = [];
  const errors = [];

  try {
    // Disable foreign key checks to allow safe truncate/reset
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const table of targetTables) {
      try {
        // Attempt TRUNCATE first (fast and resets AUTO_INCREMENT)
        await connection.query(`TRUNCATE TABLE \`${table}\``);
        clearedTables.push({ table, status: "truncated" });
      } catch (truncErr) {
        try {
          // Fallback to DELETE + ALTER AUTO_INCREMENT if truncate fails
          await connection.query(`DELETE FROM \`${table}\``);
          await connection.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
          clearedTables.push({ table, status: "deleted_and_reset" });
        } catch (delErr) {
          // Table might not exist yet
          errors.push({ table, error: delErr.message });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: preserveMasters
        ? "All transactional chit data cleared successfully. Masters (plans, batches, staff) preserved."
        : "All chit database data cleared and auto-increments reset successfully.",
      preserve_masters: preserveMasters,
      cleared_tables_count: clearedTables.length,
      cleared_tables: clearedTables,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return next(error);
  } finally {
    // Always re-enable foreign key checks and release connection
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch {}
    connection.release();
  }
};

/**
 * 3. POST / DELETE /database-api/chit/clear-category
 * Clears targeted category of data:
 * categories: 'payments' | 'installments' | 'subscriptions' | 'customers' | 'assignments' | 'masters'
 */
export const clearChitCategory = async (req, res, next) => {
  if (!isConfirmed(req)) {
    return res.status(400).json({
      success: false,
      message:
        "Confirmation required. Provide { confirm: true } in body or ?confirm=true in query.",
    });
  }

  const category = (
    req.body?.category ||
    req.query?.category ||
    ""
  ).toLowerCase();

  const CATEGORY_MAP = {
    payments: [
      "chit_payment_allocations",
      "chit_collections_payments",
      "chit_collections",
    ],
    installments: [
      "chit_payment_allocations",
      "chit_customer_installments",
    ],
    subscriptions: [
      "chit_payment_allocations",
      "chit_collections_payments",
      "chit_collections",
      "chit_customer_installments",
      "chit_customer_subscriptions",
    ],
    assignments: ["user_chit_customer_assignments"],
    customers: [
      "user_chit_customer_assignments",
      "chit_payment_allocations",
      "chit_collections_payments",
      "chit_collections",
      "chit_customer_installments",
      "chit_customer_subscriptions",
      "chit_customers",
    ],
    masters: [
      "batch_plans",
      "plan_rules",
      "chit_agent_and_staff",
      "batches",
      "plans",
    ],
  };

  const tablesToClear = CATEGORY_MAP[category];

  if (!tablesToClear) {
    return res.status(400).json({
      success: false,
      message: `Invalid category '${category}'. Allowed categories: ${Object.keys(
        CATEGORY_MAP
      ).join(", ")}`,
    });
  }

  const connection = await db.getConnection();
  const clearedTables = [];

  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const table of tablesToClear) {
      try {
        await connection.query(`TRUNCATE TABLE \`${table}\``);
        clearedTables.push({ table, status: "truncated" });
      } catch {
        try {
          await connection.query(`DELETE FROM \`${table}\``);
          await connection.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
          clearedTables.push({ table, status: "deleted_and_reset" });
        } catch (err) {
          clearedTables.push({ table, status: "failed", error: err.message });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Category '${category}' data cleared successfully.`,
      category,
      cleared_tables: clearedTables,
    });
  } catch (error) {
    return next(error);
  } finally {
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch {}
    connection.release();
  }
};

/**
 * 4. POST / DELETE /database-api/chit/drop-tables (and /drop-chit-tables)
 * Completely drops all chit tables from the database.
 */
export const dropChitTables = async (req, res, next) => {
  if (!isConfirmed(req)) {
    return res.status(400).json({
      success: false,
      message:
        "Confirmation required to drop tables. Send { confirm: true } in body or ?confirm=true in query.",
    });
  }

  const connection = await db.getConnection();
  const droppedTables = [];
  const errors = [];

  try {
    // Disable foreign key checks to prevent foreign key errors when dropping tables
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const tableName of CHIT_TABLES_ORDERED) {
      try {
        await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
        droppedTables.push(tableName);
      } catch (err) {
        errors.push({ table: tableName, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: "All chit tables dropped successfully.",
      dropped_count: droppedTables.length,
      tables: droppedTables,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return next(error);
  } finally {
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch {}
    connection.release();
  }
};

/**
 * 5. POST /database-api/chit/reinit-tables
 * Re-creates all chit database tables from their schema definitions.
 */
export const reinitChitTables = async (req, res, next) => {
  const created = [];
  const errors = [];

  try {
    const tableCreators = [
      { name: "plans", fn: createPlanTables },
      { name: "plan_rules", fn: createPlanRulesTables },
      { name: "batches", fn: createBatchTables },
      { name: "batch_plans", fn: createBatchPlanTables },
      { name: "chit_customers", fn: createChitCustomerTable },
      { name: "chit_agent_and_staff", fn: createAgentAndStaffTables },
      { name: "chit_customer_subscriptions", fn: createCustomerSubcriptionTables },
      { name: "chit_customer_installments", fn: createCustomerInstallments },
      { name: "chit_collections_payments", fn: createCollectionPaymentTables },
      { name: "user_chit_customer_assignments", fn: createUserAssignedCustomerTable },
      { name: "chit_collections", fn: collectionTables },
    ];

    for (const { name, fn } of tableCreators) {
      try {
        await fn(db);
        created.push(name);
      } catch (err) {
        errors.push({ table: name, error: err.message });
      }
    }

    return res.status(200).json({
      success: errors.length === 0,
      message:
        errors.length === 0
          ? "All chit database tables created / verified successfully."
          : "Some tables failed to initialize.",
      created_tables: created,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 6. POST /database-api/chit/reset-database
 * Complete Reset: Drops all chit tables and immediately re-creates them fresh.
 */
export const resetChitDatabase = async (req, res, next) => {
  if (!isConfirmed(req)) {
    return res.status(400).json({
      success: false,
      message:
        "Confirmation required to reset entire chit database. Send { confirm: true } in body or ?confirm=true in query.",
    });
  }

  const connection = await db.getConnection();
  const droppedTables = [];

  try {
    // Step 1: Drop all tables with foreign keys disabled
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const tableName of CHIT_TABLES_ORDERED) {
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      droppedTables.push(tableName);
    }
  } catch (error) {
    return next(error);
  } finally {
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch {}
    connection.release();
  }

  // Step 2: Re-initialize all tables
  const created = [];
  const errors = [];
  const tableCreators = [
    { name: "plans", fn: createPlanTables },
    { name: "plan_rules", fn: createPlanRulesTables },
    { name: "batches", fn: createBatchTables },
    { name: "batch_plans", fn: createBatchPlanTables },
    { name: "chit_customers", fn: createChitCustomerTable },
    { name: "chit_agent_and_staff", fn: createAgentAndStaffTables },
    { name: "chit_customer_subscriptions", fn: createCustomerSubcriptionTables },
    { name: "chit_customer_installments", fn: createCustomerInstallments },
    { name: "chit_collections_payments", fn: createCollectionPaymentTables },
    { name: "user_chit_customer_assignments", fn: createUserAssignedCustomerTable },
    { name: "chit_collections", fn: collectionTables },
  ];

  for (const { name, fn } of tableCreators) {
    try {
      await fn(db);
      created.push(name);
    } catch (err) {
      errors.push({ table: name, error: err.message });
    }
  }

  return res.status(200).json({
    success: errors.length === 0,
    message: "Chit database has been completely reset and re-initialized cleanly.",
    dropped_tables: droppedTables,
    reinitialized_tables: created,
    errors: errors.length > 0 ? errors : undefined,
  });
};
