# Chit Database Maintenance & Cleanup API Documentation

Base URL:
`http://localhost:5000/database-api`

---

# SECTION 1: Database Status & Verification

## 1. GET /database-api/chit/status (Check Table Status & Counts)

Returns all chit database tables, whether they exist in MySQL, and the current row count for each table.

```http
GET http://localhost:5000/database-api/chit/status
```

*Or via root alias:*
```http
GET http://localhost:5000/database-api/status
```

### Sample Response
```json
{
  "success": true,
  "message": "Chit database status fetched successfully",
  "database": "deeran_traders",
  "total_chit_records": 1254,
  "total_tables": 24,
  "tables": [
    { "table": "chit_payment_allocations", "exists": true, "records": 450 },
    { "table": "chit_collections_payments", "exists": true, "records": 450 },
    { "table": "chit_collections", "exists": true, "records": 0 },
    { "table": "chit_customer_installments", "exists": true, "records": 300 },
    { "table": "user_chit_customer_assignments", "exists": true, "records": 24 },
    { "table": "chit_customer_subscriptions", "exists": true, "records": 20 },
    { "table": "investment_payments", "exists": true, "records": 15 },
    { "table": "investment_interest_schedules", "exists": true, "records": 40 },
    { "table": "investment_subscriptions", "exists": true, "records": 10 },
    { "table": "investment_plan_amounts", "exists": true, "records": 8 },
    { "table": "investment_plans", "exists": true, "records": 2 },
    { "table": "monthly_investment_payments", "exists": true, "records": 12 },
    { "table": "monthly_investment_interest_schedules", "exists": true, "records": 36 },
    { "table": "monthly_investment_subscriptions", "exists": true, "records": 8 },
    { "table": "monthly_investment_plan_amounts", "exists": true, "records": 6 },
    { "table": "monthly_investment_plans", "exists": true, "records": 2 },
    { "table": "batch_plans", "exists": true, "records": 4 },
    { "table": "plan_rules", "exists": true, "records": 0 },
    { "table": "plan_amounts", "exists": true, "records": 12 },
    { "table": "chit_customers", "exists": true, "records": 15 },
    { "table": "chit_agent_and_staff", "exists": true, "records": 5 },
    { "table": "batches", "exists": true, "records": 3 },
    { "table": "plans", "exists": true, "records": 4 },
    { "table": "payment_methods", "exists": true, "records": 6 }
  ]
}
```

---

# SECTION 2: Clear / Wipe All Chit Data

Clears records from all chit tables and resets auto-increment IDs to `1`. Tables remain intact.
Supports query parameter `?confirm=true` or JSON body `{ "confirm": true }`.

## 2. POST /database-api/chit/clear-all-data (Wipe All Chit Data)

```http
POST http://localhost:5000/database-api/chit/clear-all-data
Content-Type: application/json
```

```json
{
  "confirm": true,
  "preserve_masters": false
}
```

*Or via query parameter:*
```http
POST http://localhost:5000/database-api/chit/clear-all-data?confirm=true
```

*Or via DELETE method:*
```http
DELETE http://localhost:5000/database-api/chit/clear-all-data?confirm=true
```

### Parameters
| Parameter | Type | In | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `confirm` | boolean | body / query | **Required**. Must be `true` to authorize wipe | `true` |
| `preserve_masters` | boolean | body / query | Optional. If `true`, keeps plans, batches, staff | `false` |

### Sample Response
```json
{
  "success": true,
  "message": "All chit database data cleared and auto-increments reset successfully.",
  "preserve_masters": false,
  "cleared_tables_count": 12,
  "cleared_tables": [
    { "table": "chit_payment_allocations", "status": "truncated" },
    { "table": "chit_collections_payments", "status": "truncated" },
    { "table": "chit_collections", "status": "truncated" },
    { "table": "chit_customer_installments", "status": "truncated" },
    { "table": "user_chit_customer_assignments", "status": "truncated" },
    { "table": "chit_customer_subscriptions", "status": "truncated" },
    { "table": "batch_plans", "status": "truncated" },
    { "table": "plan_rules", "status": "truncated" },
    { "table": "chit_customers", "status": "truncated" },
    { "table": "chit_agent_and_staff", "status": "truncated" },
    { "table": "batches", "status": "truncated" },
    { "table": "plans", "status": "truncated" }
  ]
}
```

---

## 3. POST /database-api/chit/clear-all-data (Wipe Customer & Transaction Data Only - Preserve Masters)

Keeps scheme plans, batches, and agent/staff configurations, but wipes all customers, subscriptions, installments, and payment history.

```http
POST http://localhost:5000/database-api/chit/clear-all-data
Content-Type: application/json
```

```json
{
  "confirm": true,
  "preserve_masters": true
}
```

*Or via query parameter:*
```http
POST http://localhost:5000/database-api/chit/clear-all-data?confirm=true&preserve_masters=true
```

---

# SECTION 3: Clear Specific Category of Data

Clears only a designated module or functional group of chit data.

## 4. POST /database-api/chit/clear-category (Clear by Category)

```http
POST http://localhost:5000/database-api/chit/clear-category
Content-Type: application/json
```

```json
{
  "confirm": true,
  "category": "payments"
}
```

*Or via query parameters:*
```http
POST http://localhost:5000/database-api/chit/clear-category?confirm=true&category=payments
```

*Or via DELETE method:*
```http
DELETE http://localhost:5000/database-api/chit/clear-category?confirm=true&category=payments
```

### Supported Categories
| Category Value | Tables Cleared | Description |
| :--- | :--- | :--- |
| `payments` | `chit_payment_allocations`, `chit_collections_payments`, `chit_collections` | Clears all chit payment receipts & allocations |
| `installments` | `chit_payment_allocations`, `chit_customer_installments` | Clears installment ledger & allocations |
| `subscriptions` | `chit_payment_allocations`, `chit_collections_payments`, `chit_collections`, `chit_customer_installments`, `chit_customer_subscriptions` | Clears all subscriptions & related transactions |
| `customers` | `user_chit_customer_assignments`, allocations, payments, installments, subscriptions, investment subscriptions & payments, `chit_customers` | Clears all chit customers and transactions |
| `assignments` | `user_chit_customer_assignments` | Clears collector-customer assignments |
| `investments` | `investment_payments`, `investment_interest_schedules`, `investment_subscriptions`, `investment_plan_amounts`, `investment_plans` | Clears single/weekly investment scheme |
| `investment_subscriptions` | `investment_payments`, `investment_interest_schedules`, `investment_subscriptions` | Clears single/weekly investment customer subscriptions and payouts |
| `monthly_investments` | `monthly_investment_payments`, `monthly_investment_interest_schedules`, `monthly_investment_subscriptions`, `monthly_investment_plan_amounts`, `monthly_investment_plans` | Clears monthly investment scheme |
| `monthly_investment_subscriptions` | `monthly_investment_payments`, `monthly_investment_interest_schedules`, `monthly_investment_subscriptions` | Clears monthly investment customer subscriptions and payouts |
| `all_investments` | Both single/weekly and monthly investment schemes | Clears all investment data |
| `masters` | `batch_plans`, `plan_rules`, `plan_amounts`, `chit_agent_and_staff`, `batches`, `plans`, `payment_methods`, `investment_plan_amounts`, `investment_plans`, `monthly_investment_plan_amounts`, `monthly_investment_plans` | Clears master schemes, batches, and staff |

### Sample Response
```json
{
  "success": true,
  "message": "Category 'payments' data cleared successfully.",
  "category": "payments",
  "cleared_tables": [
    { "table": "chit_payment_allocations", "status": "truncated" },
    { "table": "chit_collections_payments", "status": "truncated" },
    { "table": "chit_collections", "status": "truncated" }
  ]
}
```

---

# SECTION 4: Drop Chit Tables

Drops the physical tables from MySQL completely.

## 5. POST /database-api/chit/drop-tables (Drop All Chit Tables)

```http
POST http://localhost:5000/database-api/chit/drop-tables
Content-Type: application/json
```

```json
{
  "confirm": true
}
```

*Or via DELETE method / query parameter:*
```http
DELETE http://localhost:5000/database-api/chit/drop-tables?confirm=true
```

*Legacy backwards-compatible endpoint:*
```http
POST http://localhost:5000/database-api/drop-chit-tables?confirm=true
```

### Sample Response
```json
{
  "success": true,
  "message": "All chit tables dropped successfully.",
  "dropped_count": 24,
  "tables": [
    "chit_payment_allocations",
    "chit_collections_payments",
    "chit_collections",
    "chit_customer_installments",
    "user_chit_customer_assignments",
    "chit_customer_subscriptions",
    "investment_payments",
    "investment_interest_schedules",
    "investment_subscriptions",
    "investment_plan_amounts",
    "investment_plans",
    "monthly_investment_payments",
    "monthly_investment_interest_schedules",
    "monthly_investment_subscriptions",
    "monthly_investment_plan_amounts",
    "monthly_investment_plans",
    "batch_plans",
    "plan_rules",
    "plan_amounts",
    "chit_customers",
    "chit_agent_and_staff",
    "batches",
    "plans",
    "payment_methods"
  ]
}
```

---

# SECTION 5: Re-initialize Chit Tables

Runs the table creation scripts from schema definitions to recreate any missing or dropped chit tables.

## 6. POST /database-api/chit/reinit-tables (Re-create Chit Tables)

```http
POST http://localhost:5000/database-api/chit/reinit-tables
```

*Or via root alias:*
```http
POST http://localhost:5000/database-api/reinit-tables
```

### Sample Response
```json
{
  "success": true,
  "message": "All chit database tables created / verified successfully.",
  "created_tables": [
    "plans",
    "plan_rules",
    "batches",
    "batch_plans",
    "chit_customers",
    "chit_agent_and_staff",
    "payment_methods",
    "investments",
    "monthly_investments",
    "chit_customer_subscriptions",
    "chit_customer_installments",
    "chit_collections_payments",
    "user_chit_customer_assignments",
    "chit_collections"
  ]
}
```

---

# SECTION 6: Full Chit Database Reset (Drop + Fresh Re-creation)

Performs an atomic full reset: drops all existing chit tables and immediately re-creates fresh tables ready for use.

## 7. POST /database-api/chit/reset-database (Full Database Reset)

```http
POST http://localhost:5000/database-api/chit/reset-database
Content-Type: application/json
```

```json
{
  "confirm": true
}
```

*Or via query parameter:*
```http
POST http://localhost:5000/database-api/chit/reset-database?confirm=true
```

*Or via root alias:*
```http
POST http://localhost:5000/database-api/reset-database?confirm=true
```

### Sample Response
```json
{
  "success": true,
  "message": "Chit database has been completely reset and re-initialized cleanly.",
  "dropped_tables": [
    "chit_payment_allocations",
    "chit_collections_payments",
    "chit_collections",
    "chit_customer_installments",
    "user_chit_customer_assignments",
    "chit_customer_subscriptions",
    "investment_payments",
    "investment_interest_schedules",
    "investment_subscriptions",
    "investment_plan_amounts",
    "investment_plans",
    "monthly_investment_payments",
    "monthly_investment_interest_schedules",
    "monthly_investment_subscriptions",
    "monthly_investment_plan_amounts",
    "monthly_investment_plans",
    "batch_plans",
    "plan_rules",
    "plan_amounts",
    "chit_customers",
    "chit_agent_and_staff",
    "batches",
    "plans",
    "payment_methods"
  ],
  "reinitialized_tables": [
    "plans",
    "plan_rules",
    "batches",
    "batch_plans",
    "chit_customers",
    "chit_agent_and_staff",
    "payment_methods",
    "investments",
    "monthly_investments",
    "chit_customer_subscriptions",
    "chit_customer_installments",
    "chit_collections_payments",
    "user_chit_customer_assignments",
    "chit_collections"
  ]
}
```
