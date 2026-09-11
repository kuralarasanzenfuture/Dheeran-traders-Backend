# Chit Reports API Documentation & Copy-Paste Reference

Base URL:
`http://localhost:5000/api/chit-reports`

---

# SECTION 1: User & Staff Collection Reports (`/api/chit-reports`)

## 1. GET /api/chit-reports/user-collection-report (User Collection Report)

Supports search, collector filters, date ranges, payment mode, pagination, and grouping (`grouped` or `flat`).

```http
GET http://localhost:5000/api/chit-reports/user-collection-report?page=1&limit=10&search=admin&user_id=1&payment_mode=cash&date=today&format=grouped
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Records per page (default: 10) | `10` |
| `search` | string | Search collector name, email, or mobile | `admin` |
| `user_id` | number | Specific collector / user ID | `1` |
| `payment_mode` | string | `cash`, `upi`, `bank_transfer`, `cheque`, `card` | `cash` |
| `date` | string | `today`, `yesterday`, `this_week`, `this_month`, `last_month` | `today` |
| `from_date` | string | Start date (YYYY-MM-DD) | `2026-09-01` |
| `to_date` | string | End date (YYYY-MM-DD) | `2026-09-30` |
| `format` | string | Output structure: `grouped` (by user) or `flat` | `grouped` |

---

## 2. GET /api/chit-reports/user-collection-summary (User Collection KPI Summary & Rankings)

Returns total collections, average collection, mode breakdown, and top-performing collectors.

```http
GET http://localhost:5000/api/chit-reports/user-collection-summary?user_id=1&from_date=2026-09-01&to_date=2026-09-30
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `user_id` | number | Filter summary to single user ID | `1` |
| `date` | string | `today`, `yesterday`, `this_week`, `this_month` | `this_month` |
| `from_date` | string | Start date (YYYY-MM-DD) | `2026-09-01` |
| `to_date` | string | End date (YYYY-MM-DD) | `2026-09-30` |

---

## 3. GET /api/chit-reports/user-collection-realtime (Real-time Live User Collection Feed)

Real-time feed showing today's instant collection stats, hourly velocity, and latest transactions.

```http
GET http://localhost:5000/api/chit-reports/user-collection-realtime?user_id=1&limit=20
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `user_id` | number | Filter live activity by user ID | `1` |
| `limit` | number | Number of latest live transactions (default: 20) | `20` |

---

## 4. GET /api/chit-reports/user-collection/:user_id (Get Detailed Collections for Specific User)

Returns specific collector profile KPIs along with their paginated list of collection receipts.

```http
GET http://localhost:5000/api/chit-reports/user-collection/1?page=1&limit=10&from_date=2026-09-01&to_date=2026-09-30&payment_mode=cash
```

**URL Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `user_id` | number | ID of user / staff / collector | `1` |

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Records per page (default: 10) | `10` |
| `payment_mode` | string | Filter by mode (`cash`, `upi`, etc.) | `cash` |
| `from_date` | string | Start date (YYYY-MM-DD) | `2026-09-01` |
| `to_date` | string | End date (YYYY-MM-DD) | `2026-09-30` |

---

# SECTION 2: General Collection Reports (`/api/chit-reports`)

## 5. GET /api/chit-reports/collection-report (General Collection Report)

Complete collection receipts listing with search, collector filter, payment mode, and date filters.

```http
GET http://localhost:5000/api/chit-reports/collection-report?page=1&limit=10&search=john&collector_id=1&payment_mode=cash&date=today
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Records per page (default: 10) | `10` |
| `search` | string | Search receipt number, customer name, mobile | `john` |
| `collector_id` | number | Filter by collector user ID | `1` |
| `payment_mode` | string | `cash`, `upi`, `bank_transfer`, `cheque`, `card` | `cash` |
| `date` | string | `today`, `yesterday`, `this_week`, `this_month` | `today` |
| `from_date` | string | Start date (YYYY-MM-DD) | `2026-09-01` |
| `to_date` | string | End date (YYYY-MM-DD) | `2026-09-30` |

---

## 6. GET /api/chit-reports/collection-report-date-range (Date Range Collection Report)

Optimized date range query with custom dates and keyword search.

```http
GET http://localhost:5000/api/chit-reports/collection-report-date-range?from_date=2026-09-01&to_date=2026-09-30&search=REC-&collector_id=1&payment_mode=cash&page=1&limit=10
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `from_date` | string | Start date (YYYY-MM-DD) | `2026-09-01` |
| `to_date` | string | End date (YYYY-MM-DD) | `2026-09-30` |
| `search` | string | Receipt no, customer name or phone | `REC-` |
| `collector_id` | number | Collector user ID | `1` |
| `payment_mode` | string | Mode of payment | `cash` |
| `page` | number | Page number | `1` |
| `limit` | number | Page size | `10` |

---

## 7. GET /api/chit-reports/collection-report-monthly (Monthly Collection Trend Report)

Returns month-by-month aggregated collections for any chosen year.

```http
GET http://localhost:5000/api/chit-reports/collection-report-monthly?year=2026
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `year` | number | Calendar year (default: current year) | `2026` |

---

## 8. GET /api/chit-reports/collection-report-Pending-Overdue (Pending & Overdue Installments)

Lists accounts with pending or overdue installments, days overdue, and arrears amounts.

```http
GET http://localhost:5000/api/chit-reports/collection-report-Pending-Overdue?page=1&limit=10&status=overdue&plan_id=1
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Records per page (default: 10) | `10` |
| `status` | string | Filter status: `pending` or `overdue` | `overdue` |
| `plan_id` | number | Filter by scheme / plan ID | `1` |

---

## 9. GET /api/chit-reports/collection-collector-pending-report (Collector-wise Pending Dues Report)

Aggregated summary of pending collection amounts grouped by assigned collector.

```http
GET http://localhost:5000/api/chit-reports/collection-collector-pending-report
```

---

# SECTION 3: Customer, Batch, Plan & Agent Reports (`/api/chit-reports`)

## 10. GET /api/chit-reports/customer-report (Customer Summary & Accounts Report)

Detailed report of customers, total subscriptions, amounts paid, and balance due.

```http
GET http://localhost:5000/api/chit-reports/customer-report?page=1&limit=10&search=kural&status=active
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Records per page (default: 10) | `10` |
| `search` | string | Customer name, phone, or email | `kural` |
| `status` | string | Account status: `active`, `completed`, etc. | `active` |

---

## 11. GET /api/chit-reports/batch-report (Chit Batch / Group Utilization Report)

Report on chit batches, member capacity, total pool collected, and batch status.

```http
GET http://localhost:5000/api/chit-reports/batch-report?page=1&limit=10&plan_id=1&status=running
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `page` | number | Page number | `1` |
| `limit` | number | Page size | `10` |
| `plan_id` | number | Filter by scheme/plan ID | `1` |
| `status` | string | `running`, `closed`, `upcoming` | `running` |

---

## 12. GET /api/chit-reports/plan-report (Chit Plan / Scheme Performance Report)

Performance report for chit schemes including total enrolled members and total revenue.

```http
GET http://localhost:5000/api/chit-reports/plan-report?page=1&limit=10&is_active=true
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `page` | number | Page number | `1` |
| `limit` | number | Page size | `10` |
| `is_active` | boolean | Active status (`true` / `false`) | `true` |

---

## 13. GET /api/chit-reports/agent-report (Agent Performance & Commission Report)

Shows agents, customer referrals, active accounts, and commission earned.

```http
GET http://localhost:5000/api/chit-reports/agent-report?page=1&limit=10&search=agent
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `page` | number | Page number | `1` |
| `limit` | number | Page size | `10` |
| `search` | string | Search agent name, mobile, code | `agent` |

---

## 14. GET /api/chit-reports/assigned-customer-report (Collector Customer Route Assignments)

Mapping of collectors to their assigned subscribers and collection routes.

```http
GET http://localhost:5000/api/chit-reports/assigned-customer-report?page=1&limit=10&collector_id=1
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `page` | number | Page number | `1` |
| `limit` | number | Page size | `10` |
| `collector_id` | number | Filter by specific collector ID | `1` |

---

# SECTION 4: Performance, Analytics & Dashboards (`/api/chit-reports`)

## 15. GET /api/chit-reports/collector-performance (Collector Performance Rankings & Targets)

Collection efficiency percentages, target vs actuals, and leaderboard rankings.

```http
GET http://localhost:5000/api/chit-reports/collector-performance?month=9&year=2026
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `month` | number | Month index (1-12) | `9` |
| `year` | number | Calendar year | `2026` |

---

## 16. GET /api/chit-reports/daily-analytics (Daily Analytics Trend & Hourly Breakdown)

Time-series metrics, transaction velocities, and hour-by-hour collection breakdown for any day.

```http
GET http://localhost:5000/api/chit-reports/daily-analytics?date=2026-09-10
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `date` | string | Target date (YYYY-MM-DD, defaults to today) | `2026-09-10` |

---

## 17. GET /api/chit-reports/monthly-analytics (Monthly Financial Analytics)

Month-over-month revenue analysis, growth rates, and category breakdowns.

```http
GET http://localhost:5000/api/chit-reports/monthly-analytics?year=2026
```

**Query Parameters:**
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `year` | number | Target year (default: current year) | `2026` |

---

## 18. GET /api/chit-reports/dashboard (Executive Reports Dashboard Overview)

High-level executive metrics combining today's collections, monthly totals, active subscribers, and dues.

```http
GET http://localhost:5000/api/chit-reports/dashboard
```

---

## 19. GET /api/chit-reports/mobile-dashboard (Mobile Collector Daily Run Dashboard)

Tailored for mobile app field collectors. Requires authentication token to identify the logged-in collector.

```http
GET http://localhost:5000/api/chit-reports/mobile-dashboard
Authorization: Bearer <collector_jwt_token>
```

**Headers:**
| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <token>` | JWT token of the logged-in collector |
