import db from "../../../config/db.js";

/**
 * ============================================================================
 * HELPER: Build Collector Assignment Scope Condition
 * ============================================================================
 * Determines if the requesting user is ADMIN or a collector.
 * If collector (non-ADMIN), restricts to customers assigned either:
 *   1) Directly via user_chit_customer_assignments (is_active = TRUE)
 *   2) By Area via user_area_assignments (is_active = TRUE, where c.area_id = uaa.area_id)
 * If ADMIN and queryUserId is provided, restricts to that collector's scope.
 * If ADMIN and no queryUserId, returns empty condition (full access).
 */
export const getCollectorAssignmentScope = async (
  dbConn,
  authUserId,
  queryUserId = null,
  assignmentType = "all"
) => {
  const [roleRow] = await dbConn.query(
    `SELECT r.role_name 
     FROM users_roles u
     JOIN role_based r ON r.id = u.role_id
     WHERE u.id = ?`,
    [authUserId]
  );

  const roleName = String(roleRow[0]?.role_name || "").toUpperCase();
  const isAdmin = roleName === "ADMIN";

  const effectiveUserId =
    isAdmin && queryUserId
      ? parseInt(queryUserId, 10)
      : !isAdmin
      ? authUserId
      : null;

  let condition = "";
  const params = [];

  if (effectiveUserId) {
    const type = String(assignmentType || "all").toLowerCase();

    if (type === "area") {
      condition += `
        AND s.customer_id IN (
          SELECT c_sub.id 
          FROM chit_customers c_sub
          JOIN user_area_assignments uaa ON uaa.area_id = c_sub.area_id
          WHERE uaa.user_id = ? AND uaa.is_active = TRUE
        )
      `;
      params.push(effectiveUserId);
    } else if (type === "direct") {
      condition += `
        AND s.customer_id IN (
          SELECT uca.customer_id 
          FROM user_chit_customer_assignments uca
          WHERE uca.user_id = ? AND uca.is_active = TRUE
        )
      `;
      params.push(effectiveUserId);
    } else {
      // Default: ALL (Direct OR Area Assignment)
      condition += `
        AND (
          s.customer_id IN (
            SELECT uca.customer_id 
            FROM user_chit_customer_assignments uca
            WHERE uca.user_id = ? AND uca.is_active = TRUE
          )
          OR s.customer_id IN (
            SELECT c_sub.id 
            FROM chit_customers c_sub
            JOIN user_area_assignments uaa ON uaa.area_id = c_sub.area_id
            WHERE uaa.user_id = ? AND uaa.is_active = TRUE
          )
        )
      `;
      params.push(effectiveUserId, effectiveUserId);
    }
  }

  return {
    isAdmin,
    role: roleName,
    effectiveUserId,
    condition,
    params,
  };
};

/**
 * ============================================================================
 * HELPER: Build Dynamic Installment Query Filters
 * ============================================================================
 */
export const buildInstallmentQueryFilters = ({
  area_id,
  area_ids,
  customer_id,
  subscription_id,
  batch_id,
  plan_id,
  date,
  from,
  to,
  type,
  search,
}) => {
  let filterSql = "";
  const filterParams = [];

  // 1. Single or Multiple Areas
  if (area_id) {
    filterSql += " AND c.area_id = ? ";
    filterParams.push(parseInt(area_id, 10));
  } else if (area_ids) {
    const ids = Array.isArray(area_ids)
      ? area_ids.map((id) => parseInt(id, 10)).filter(Boolean)
      : String(area_ids)
          .split(",")
          .map((id) => parseInt(id.trim(), 10))
          .filter(Boolean);

    if (ids.length > 0) {
      filterSql += ` AND c.area_id IN (${ids.map(() => "?").join(",")}) `;
      filterParams.push(...ids);
    }
  }

  // 2. Customer ID
  if (customer_id) {
    filterSql += " AND s.customer_id = ? ";
    filterParams.push(parseInt(customer_id, 10));
  }

  // 3. Subscription ID
  if (subscription_id) {
    filterSql += " AND s.id = ? ";
    filterParams.push(parseInt(subscription_id, 10));
  }

  // 4. Batch ID
  if (batch_id) {
    filterSql += " AND s.batch_id = ? ";
    filterParams.push(parseInt(batch_id, 10));
  }

  // 5. Plan ID
  if (plan_id) {
    filterSql += " AND s.plan_id = ? ";
    filterParams.push(parseInt(plan_id, 10));
  }

  // 6. Date filters (Specific date, Date range, or Date type)
  if (date) {
    filterSql += `
      AND i.due_date >= ?
      AND i.due_date < DATE_ADD(?, INTERVAL 1 DAY)
    `;
    filterParams.push(date, date);
  } else if (from && to) {
    filterSql += `
      AND i.due_date >= ?
      AND i.due_date < DATE_ADD(?, INTERVAL 1 DAY)
    `;
    filterParams.push(from, to);
  } else if (type) {
    const t = String(type).toLowerCase();
    if (t === "today") {
      filterSql += `
        AND i.due_date >= CURDATE()
        AND i.due_date < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      `;
    } else if (t === "overdue") {
      filterSql += " AND i.due_date < CURDATE() ";
    } else if (t === "upcoming") {
      filterSql += " AND i.due_date >= DATE_ADD(CURDATE(), INTERVAL 1 DAY) ";
    }
  }

  // 7. Search filter
  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    filterSql += `
      AND (
        c.name LIKE ?
        OR c.phone LIKE ?
        OR c.place LIKE ?
        OR c.door_no LIKE ?
        OR a.name LIKE ?
        OR a.code LIKE ?
        OR b.batch_name LIKE ?
        OR p2.plan_name LIKE ?
      )
    `;
    filterParams.push(term, term, term, term, term, term, term, term);
  }

  return { filterSql, filterParams };
};

/**
 * ============================================================================
 * 1. GET AREA-WISE ASSIGNED COLLECTIONS
 * GET /api/installments/due/area-wise
 * ============================================================================
 * Aggregates collection dues grouped area-by-area.
 * Supports:
 *   - area_id / area_ids
 *   - status (all, paid, pending, overdue, today)
 *   - type (all, today, overdue, upcoming)
 *   - date (YYYY-MM-DD)
 *   - from & to (Date range)
 *   - search (customer name, phone, area, batch, plan)
 *   - user_id (Admin can filter by specific collector)
 *   - assignment_type (all, area, direct)
 *   - include_installments (true/false) -> embed installment list inside each area
 *   - sort_by & sort_order
 */
export const getAreaWiseAssignedCollections = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      area_id,
      area_ids,
      status = "all",
      type = "all",
      date,
      from,
      to,
      search,
      user_id,
      assignment_type = "all",
      batch_id,
      plan_id,
      include_installments = "false",
      sort_by = "area_name",
      sort_order = "ASC",
    } = req.query;

    const { isAdmin, effectiveUserId, condition, params: scopeParams } =
      await getCollectorAssignmentScope(db, authUserId, user_id, assignment_type);

    const { filterSql, filterParams } = buildInstallmentQueryFilters({
      area_id,
      area_ids,
      batch_id,
      plan_id,
      date,
      from,
      to,
      type,
      search,
    });

    // Subquery condition for status
    let statusFilterCondition = "";
    const statusParam = [];
    const normalizedStatus = String(status).toUpperCase();

    if (normalizedStatus === "PAID") {
      statusFilterCondition = " HAVING status = 'PAID' ";
    } else if (normalizedStatus === "PENDING") {
      statusFilterCondition = " HAVING status = 'PENDING' ";
    } else if (normalizedStatus === "OVERDUE") {
      statusFilterCondition = " HAVING status = 'OVERDUE' ";
    } else if (normalizedStatus === "TODAY") {
      statusFilterCondition =
        " HAVING DATE(due_date) = CURDATE() AND status != 'PAID' ";
    }

    // Base query for all relevant installments
    const baseInstallmentQuery = `
      SELECT
        i.id AS installment_id,
        i.subscription_id,
        i.installment_number,
        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
        i.installment_amount,

        IFNULL(p.total_paid, 0) AS paid_amount,
        GREATEST(0, (i.installment_amount - IFNULL(p.total_paid, 0))) AS pending_amount,

        IFNULL(p.total_upi, 0) AS upi_amount,
        IFNULL(p.total_cash, 0) AS cash_amount,
        IFNULL(p.total_cheque, 0) AS cheque_amount,
        IFNULL(p.upi_references, '') AS upi_references,
        IFNULL(p.today_collection, 0) AS today_collection,

        CASE 
          WHEN IFNULL(p.total_paid, 0) >= i.installment_amount THEN 'PAID'
          WHEN DATE(i.due_date) < CURDATE() THEN 'OVERDUE'
          ELSE 'PENDING'
        END AS status,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.place,
        c.door_no,
        c.address,
        c.state,
        c.district,
        c.pincode,

        COALESCE(a.id, 0) AS area_id,
        COALESCE(a.name, 'Unassigned Area') AS area_name,
        COALESCE(a.code, 'NONE') AS area_code,

        b.id AS batch_id,
        b.batch_name,
        p2.id AS plan_id,
        p2.plan_name

      FROM chit_customer_installments i
      JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
      JOIN chit_customers c ON c.id = s.customer_id
      LEFT JOIN areas a ON a.id = c.area_id
      JOIN batches b ON b.id = s.batch_id
      JOIN plans p2 ON p2.id = s.plan_id

      LEFT JOIN (
        SELECT 
          pa.installment_id,
          SUM(pa.allocated_amount) AS total_paid,
          SUM((cp.pay_upi * pa.allocated_amount) / NULLIF(cp.total_amount, 0)) AS total_upi,
          SUM((cp.pay_cash * pa.allocated_amount) / NULLIF(cp.total_amount, 0)) AS total_cash,
          SUM((cp.pay_cheque * pa.allocated_amount) / NULLIF(cp.total_amount, 0)) AS total_cheque,
          GROUP_CONCAT(DISTINCT cp.pay_upi_reference) AS upi_references,
          SUM(
            CASE 
              WHEN DATE(cp.payment_datetime) = CURDATE() 
              THEN pa.allocated_amount 
              ELSE 0 
            END
          ) AS today_collection
        FROM chit_payment_allocations pa
        JOIN chit_collections_payments cp ON cp.id = pa.payment_id
        GROUP BY pa.installment_id
      ) p ON p.installment_id = i.id

      WHERE 1=1
      ${condition}
      ${filterSql}
      GROUP BY i.id, s.id, c.id, a.id, b.id, p2.id
      ${statusFilterCondition}
      ORDER BY COALESCE(a.name, 'Unassigned Area') ASC, c.name ASC, i.due_date ASC
    `;

    const allParams = [...scopeParams, ...filterParams, ...statusParam];
    const [rows] = await db.query(baseInstallmentQuery, allParams);

    // Fetch assigned collectors for relevant areas
    const areaIdsSet = new Set(
      rows.map((r) => r.area_id).filter((id) => id && id > 0)
    );
    const collectorsByArea = new Map();

    if (areaIdsSet.size > 0) {
      const areaIdsArr = Array.from(areaIdsSet);
      const [collectorRows] = await db.query(
        `SELECT 
           uaa.area_id,
           u.id AS user_id,
           u.username,
           u.phone,
           r.role_name
         FROM user_area_assignments uaa
         JOIN users_roles u ON u.id = uaa.user_id
         JOIN role_based r ON r.id = u.role_id
         WHERE uaa.area_id IN (${areaIdsArr.map(() => "?").join(",")})
           AND uaa.is_active = TRUE`,
        areaIdsArr
      );

      for (const crow of collectorRows) {
        if (!collectorsByArea.has(crow.area_id)) {
          collectorsByArea.set(crow.area_id, []);
        }
        collectorsByArea.get(crow.area_id).push({
          user_id: crow.user_id,
          username: crow.username,
          phone: crow.phone,
          role_name: crow.role_name,
        });
      }
    }

    // Group installments by Area
    const areaMap = new Map();
    const shouldIncludeInstallments =
      String(include_installments).toLowerCase() === "true";

    let grandTotalAmount = 0;
    let grandTotalPaid = 0;
    let grandTotalPending = 0;
    let grandTodayDue = 0;
    let grandTodayCollection = 0;
    let grandOverdueAmount = 0;
    let grandTotalUpi = 0;
    let grandTotalCash = 0;
    let grandTotalCheque = 0;
    let grandPaidCount = 0;
    let grandPendingCount = 0;
    let grandOverdueCount = 0;

    const uniqueCustomersGlobal = new Set();
    const uniqueSubscriptionsGlobal = new Set();

    for (const row of rows) {
      const aId = row.area_id;
      const instAmt = Number(row.installment_amount || 0);
      const paidAmt = Number(row.paid_amount || 0);
      const pendAmt = Number(row.pending_amount || 0);
      const todayPaid = Number(row.today_collection || 0);
      const upiAmt = Number(row.upi_amount || 0);
      const cashAmt = Number(row.cash_amount || 0);
      const chequeAmt = Number(row.cheque_amount || 0);

      uniqueCustomersGlobal.add(row.customer_id);
      uniqueSubscriptionsGlobal.add(row.subscription_id);

      grandTotalAmount += instAmt;
      grandTotalPaid += paidAmt;
      grandTotalPending += pendAmt;
      grandTodayCollection += todayPaid;
      grandTotalUpi += upiAmt;
      grandTotalCash += cashAmt;
      grandTotalCheque += chequeAmt;

      const isTodayDue = row.due_date === new Date().toISOString().slice(0, 10);
      if (isTodayDue && row.status !== "PAID") {
        grandTodayDue += pendAmt;
      }
      if (row.status === "OVERDUE") {
        grandOverdueAmount += pendAmt;
        grandOverdueCount += 1;
      } else if (row.status === "PAID") {
        grandPaidCount += 1;
      } else {
        grandPendingCount += 1;
      }

      if (!areaMap.has(aId)) {
        areaMap.set(aId, {
          area_id: aId,
          area_name: row.area_name,
          area_code: row.area_code,
          customers_set: new Set(),
          subscriptions_set: new Set(),
          total_installments: 0,
          total_amount: 0,
          total_paid: 0,
          total_pending: 0,
          today_due_amount: 0,
          today_collection: 0,
          overdue_amount: 0,
          paid_count: 0,
          pending_count: 0,
          overdue_count: 0,
          total_upi: 0,
          total_cash: 0,
          total_cheque: 0,
          assigned_collectors: collectorsByArea.get(aId) || [],
          installments: [],
        });
      }

      const areaObj = areaMap.get(aId);
      areaObj.customers_set.add(row.customer_id);
      areaObj.subscriptions_set.add(row.subscription_id);
      areaObj.total_installments += 1;
      areaObj.total_amount += instAmt;
      areaObj.total_paid += paidAmt;
      areaObj.total_pending += pendAmt;
      areaObj.today_collection += todayPaid;
      areaObj.total_upi += upiAmt;
      areaObj.total_cash += cashAmt;
      areaObj.total_cheque += chequeAmt;

      if (isTodayDue && row.status !== "PAID") {
        areaObj.today_due_amount += pendAmt;
      }
      if (row.status === "OVERDUE") {
        areaObj.overdue_amount += pendAmt;
        areaObj.overdue_count += 1;
      } else if (row.status === "PAID") {
        areaObj.paid_count += 1;
      } else {
        areaObj.pending_count += 1;
      }

      if (shouldIncludeInstallments) {
        areaObj.installments.push({
          ...row,
          upi_references: row.upi_references
            ? row.upi_references.split(",")
            : [],
        });
      }
    }

    // Convert map to array and format metrics
    let areaList = Array.from(areaMap.values()).map((a) => {
      const totalAmt = a.total_amount;
      const totalPaid = a.total_paid;
      const recRate =
        totalAmt > 0 ? Number(((totalPaid / totalAmt) * 100).toFixed(2)) : 0;

      const result = {
        area_id: a.area_id,
        area_name: a.area_name,
        area_code: a.area_code,
        total_customers: a.customers_set.size,
        total_subscriptions: a.subscriptions_set.size,
        total_installments: a.total_installments,
        total_amount: Number(a.total_amount.toFixed(2)),
        total_paid: Number(a.total_paid.toFixed(2)),
        total_pending: Number(a.total_pending.toFixed(2)),
        today_due_amount: Number(a.today_due_amount.toFixed(2)),
        today_collection: Number(a.today_collection.toFixed(2)),
        overdue_amount: Number(a.overdue_amount.toFixed(2)),
        paid_count: a.paid_count,
        pending_count: a.pending_count,
        overdue_count: a.overdue_count,
        recovery_rate: recRate,
        total_upi: Number(a.total_upi.toFixed(2)),
        total_cash: Number(a.total_cash.toFixed(2)),
        total_cheque: Number(a.total_cheque.toFixed(2)),
        assigned_collectors: a.assigned_collectors,
      };

      if (shouldIncludeInstallments) {
        result.installments = a.installments;
      }

      return result;
    });

    // Sort area list
    const dir = String(sort_order).toUpperCase() === "DESC" ? -1 : 1;
    areaList.sort((a, b) => {
      if (sort_by === "total_amount") return (a.total_amount - b.total_amount) * dir;
      if (sort_by === "total_pending")
        return (a.total_pending - b.total_pending) * dir;
      if (sort_by === "overdue_amount")
        return (a.overdue_amount - b.overdue_amount) * dir;
      if (sort_by === "total_customers")
        return (a.total_customers - b.total_customers) * dir;
      return String(a.area_name).localeCompare(String(b.area_name)) * dir;
    });

    const grandRecoveryRate =
      grandTotalAmount > 0
        ? Number(((grandTotalPaid / grandTotalAmount) * 100).toFixed(2))
        : 0;

    return res.status(200).json({
      success: true,
      message: "Area-wise assigned collections retrieved successfully",
      filters: {
        status,
        type,
        date: date || null,
        from: from || null,
        to: to || null,
        search: search || null,
        area_id: area_id ? parseInt(area_id, 10) : null,
        user_id: effectiveUserId,
        assignment_type,
      },
      grand_summary: {
        total_areas: areaList.length,
        total_customers: uniqueCustomersGlobal.size,
        total_subscriptions: uniqueSubscriptionsGlobal.size,
        total_installments: rows.length,
        total_amount: Number(grandTotalAmount.toFixed(2)),
        total_paid: Number(grandTotalPaid.toFixed(2)),
        total_pending: Number(grandTotalPending.toFixed(2)),
        today_due_amount: Number(grandTodayDue.toFixed(2)),
        today_collection: Number(grandTodayCollection.toFixed(2)),
        overdue_amount: Number(grandOverdueAmount.toFixed(2)),
        paid_count: grandPaidCount,
        pending_count: grandPendingCount,
        overdue_count: grandOverdueCount,
        recovery_rate: grandRecoveryRate,
        total_upi: Number(grandTotalUpi.toFixed(2)),
        total_cash: Number(grandTotalCash.toFixed(2)),
        total_cheque: Number(grandTotalCheque.toFixed(2)),
      },
      data: areaList,
    });
  } catch (err) {
    console.error("getAreaWiseAssignedCollections Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve area-wise assigned collections",
    });
  }
};

/**
 * ============================================================================
 * 2. GET SPECIFIC AREA DUE / COLLECTION LIST
 * GET /api/installments/due/area/:area_id
 * ============================================================================
 * Returns installment dues for customers residing in the specified area.
 * For non-admin collectors, verifies that the user is assigned to this area
 * or has directly assigned customers in this area.
 */
export const getAreaDueList = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { area_id } = req.params;
    if (!area_id || isNaN(parseInt(area_id, 10))) {
      return res.status(400).json({
        success: false,
        message: "Valid numeric area_id parameter is required",
      });
    }
    const targetAreaId = parseInt(area_id, 10);

    // Verify area exists
    const [areaRows] = await db.query(
      "SELECT id, name, code, status FROM areas WHERE id = ?",
      [targetAreaId]
    );
    if (!areaRows.length) {
      return res.status(404).json({ success: false, message: "Area not found" });
    }
    const areaInfo = areaRows[0];

    // Check user role and permissions
    const [roleRow] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [authUserId]
    );
    const roleName = String(roleRow[0]?.role_name || "").toUpperCase();
    const isAdmin = roleName === "ADMIN";

    // If not admin, check if user is assigned to this area OR has assigned customers in it
    if (!isAdmin) {
      const [assignmentCheck] = await db.query(
        `SELECT 1 FROM user_area_assignments 
         WHERE user_id = ? AND area_id = ? AND is_active = TRUE
         UNION
         SELECT 1 FROM user_chit_customer_assignments uca
         JOIN chit_customers c ON c.id = uca.customer_id
         WHERE uca.user_id = ? AND c.area_id = ? AND uca.is_active = TRUE
         LIMIT 1`,
        [authUserId, targetAreaId, authUserId, targetAreaId]
      );

      if (!assignmentCheck.length) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: You are not assigned to this area or its customers",
        });
      }
    }

    const {
      status = "all",
      type = "all",
      date,
      from,
      to,
      search,
      batch_id,
      plan_id,
      page = 1,
      limit = 20,
      sort_by = "due_date",
      sort_order = "ASC",
    } = req.query;

    const { filterSql, filterParams } = buildInstallmentQueryFilters({
      area_id: targetAreaId,
      batch_id,
      plan_id,
      date,
      from,
      to,
      type,
      search,
    });

    let statusCondition = "";
    const normalizedStatus = String(status).toUpperCase();
    if (normalizedStatus === "PAID") {
      statusCondition = " HAVING status = 'PAID' ";
    } else if (normalizedStatus === "PENDING") {
      statusCondition = " HAVING status = 'PENDING' ";
    } else if (normalizedStatus === "OVERDUE") {
      statusCondition = " HAVING status = 'OVERDUE' ";
    } else if (normalizedStatus === "TODAY") {
      statusCondition =
        " HAVING DATE(due_date) = CURDATE() AND status != 'PAID' ";
    }

    // Collector restriction within area if not admin
    let collectorConstraint = "";
    const collectorParams = [];
    if (!isAdmin) {
      collectorConstraint = `
        AND (
          s.customer_id IN (
            SELECT uca.customer_id FROM user_chit_customer_assignments uca
            WHERE uca.user_id = ? AND uca.is_active = TRUE
          )
          OR EXISTS (
            SELECT 1 FROM user_area_assignments uaa
            WHERE uaa.user_id = ? AND uaa.area_id = c.area_id AND uaa.is_active = TRUE
          )
        )
      `;
      collectorParams.push(authUserId, authUserId);
    }

    const sortFields = {
      due_date: "i.due_date",
      customer_name: "c.name",
      installment_number: "i.installment_number",
      installment_amount: "i.installment_amount",
      pending_amount: "pending_amount",
    };
    const sortCol = sortFields[sort_by] || "i.due_date";
    const sortDir = String(sort_order).toUpperCase() === "DESC" ? "DESC" : "ASC";

    const query = `
      SELECT
        i.id AS installment_id,
        i.subscription_id,
        i.installment_number,
        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
        i.installment_amount,

        IFNULL(p.total_paid, 0) AS paid_amount,
        GREATEST(0, (i.installment_amount - IFNULL(p.total_paid, 0))) AS pending_amount,

        IFNULL(p.total_upi, 0) AS upi_amount,
        IFNULL(p.total_cash, 0) AS cash_amount,
        IFNULL(p.total_cheque, 0) AS cheque_amount,
        IFNULL(p.upi_references, '') AS upi_references,
        IFNULL(p.today_collection, 0) AS today_collection,

        CASE 
          WHEN IFNULL(p.total_paid, 0) >= i.installment_amount THEN 'PAID'
          WHEN DATE(i.due_date) < CURDATE() THEN 'OVERDUE'
          ELSE 'PENDING'
        END AS status,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.place,
        c.door_no,
        c.address,
        c.state,
        c.district,
        c.pincode,
        c.aadhar,
        c.pan_number,

        a.id AS area_id,
        a.name AS area_name,
        a.code AS area_code,

        b.id AS batch_id,
        b.batch_name,
        p2.id AS plan_id,
        p2.plan_name

      FROM chit_customer_installments i
      JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
      JOIN chit_customers c ON c.id = s.customer_id
      LEFT JOIN areas a ON a.id = c.area_id
      JOIN batches b ON b.id = s.batch_id
      JOIN plans p2 ON p2.id = s.plan_id

      LEFT JOIN (
        SELECT 
          pa.installment_id,
          SUM(pa.allocated_amount) AS total_paid,
          SUM((cp.pay_upi * pa.allocated_amount) / NULLIF(cp.total_amount, 0)) AS total_upi,
          SUM((cp.pay_cash * pa.allocated_amount) / NULLIF(cp.total_amount, 0)) AS total_cash,
          SUM((cp.pay_cheque * pa.allocated_amount) / NULLIF(cp.total_amount, 0)) AS total_cheque,
          GROUP_CONCAT(DISTINCT cp.pay_upi_reference) AS upi_references,
          SUM(
            CASE 
              WHEN DATE(cp.payment_datetime) = CURDATE() 
              THEN pa.allocated_amount 
              ELSE 0 
            END
          ) AS today_collection
        FROM chit_payment_allocations pa
        JOIN chit_collections_payments cp ON cp.id = pa.payment_id
        GROUP BY pa.installment_id
      ) p ON p.installment_id = i.id

      WHERE 1=1
      ${collectorConstraint}
      ${filterSql}
      GROUP BY i.id, s.id, c.id, a.id, b.id, p2.id
      ${statusCondition}
      ORDER BY ${sortCol} ${sortDir}
    `;

    const queryParams = [...collectorParams, ...filterParams];
    const [allRows] = await db.query(query, queryParams);

    // Compute Summary for this area
    let totalAmt = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let todayDue = 0;
    let todayColl = 0;
    let overdueAmt = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let totalUpi = 0;
    let totalCash = 0;
    let totalCheque = 0;

    const uniqueCusts = new Set();
    const uniqueSubs = new Set();

    for (const r of allRows) {
      uniqueCusts.add(r.customer_id);
      uniqueSubs.add(r.subscription_id);

      const iAmt = Number(r.installment_amount || 0);
      const pAmt = Number(r.paid_amount || 0);
      const pendAmt = Number(r.pending_amount || 0);

      totalAmt += iAmt;
      totalPaid += pAmt;
      totalPending += pendAmt;
      todayColl += Number(r.today_collection || 0);
      totalUpi += Number(r.upi_amount || 0);
      totalCash += Number(r.cash_amount || 0);
      totalCheque += Number(r.cheque_amount || 0);

      const isTodayDue = r.due_date === new Date().toISOString().slice(0, 10);
      if (isTodayDue && r.status !== "PAID") {
        todayDue += pendAmt;
      }
      if (r.status === "OVERDUE") {
        overdueAmt += pendAmt;
        overdueCount += 1;
      } else if (r.status === "PAID") {
        paidCount += 1;
      } else {
        pendingCount += 1;
      }
    }

    // Pagination
    const totalRecords = allRows.length;
    const isUnpaginated =
      String(limit).toLowerCase() === "all" ||
      parseInt(limit, 10) === 0 ||
      parseInt(limit, 10) < 0;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = isUnpaginated
      ? totalRecords
      : Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const totalPages = isUnpaginated ? 1 : Math.ceil(totalRecords / pageLimit) || 1;
    const offset = (pageNum - 1) * pageLimit;

    const paginatedRows = isUnpaginated
      ? allRows
      : allRows.slice(offset, offset + pageLimit);

    const formattedData = paginatedRows.map((r) => ({
      ...r,
      upi_references: r.upi_references ? r.upi_references.split(",") : [],
    }));

    return res.status(200).json({
      success: true,
      message: `Due list for area '${areaInfo.name}' retrieved successfully`,
      area: areaInfo,
      summary: {
        total_installments: totalRecords,
        total_customers: uniqueCusts.size,
        total_subscriptions: uniqueSubs.size,
        total_amount: Number(totalAmt.toFixed(2)),
        total_paid: Number(totalPaid.toFixed(2)),
        total_pending: Number(totalPending.toFixed(2)),
        today_due_amount: Number(todayDue.toFixed(2)),
        today_collection: Number(todayColl.toFixed(2)),
        overdue_amount: Number(overdueAmt.toFixed(2)),
        paid_count: paidCount,
        pending_count: pendingCount,
        overdue_count: overdueCount,
        recovery_rate:
          totalAmt > 0
            ? Number(((totalPaid / totalAmt) * 100).toFixed(2))
            : 0,
        total_upi: Number(totalUpi.toFixed(2)),
        total_cash: Number(totalCash.toFixed(2)),
        total_cheque: Number(totalCheque.toFixed(2)),
      },
      pagination: {
        total_records: totalRecords,
        current_page: isUnpaginated ? 1 : pageNum,
        limit: pageLimit,
        total_pages: totalPages,
        has_next_page: !isUnpaginated && pageNum < totalPages,
        has_prev_page: !isUnpaginated && pageNum > 1,
      },
      data: formattedData,
    });
  } catch (err) {
    console.error("getAreaDueList Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve area due list",
    });
  }
};

/**
 * ============================================================================
 * 3. GET MY ASSIGNED AREAS COLLECTIONS SUMMARY
 * GET /api/installments/due/assigned-areas
 * ============================================================================
 * Returns list of areas assigned to the logged-in user with collection
 * performance metrics for mobile/web dashboard cards.
 */
export const getMyAssignedAreasCollectionsSummary = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { user_id, search } = req.query;

    const [roleRow] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [authUserId]
    );
    const roleName = String(roleRow[0]?.role_name || "").toUpperCase();
    const isAdmin = roleName === "ADMIN";

    const targetUserId =
      isAdmin && user_id ? parseInt(user_id, 10) : (!isAdmin ? authUserId : null);

    let whereClause = "uaa.is_active = TRUE";
    const params = [];

    if (targetUserId) {
      whereClause += " AND uaa.user_id = ? ";
      params.push(targetUserId);
    }

    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      whereClause += " AND (a.name LIKE ? OR a.code LIKE ?) ";
      params.push(term, term);
    }

    const [areaRows] = await db.query(
      `SELECT 
         a.id AS area_id,
         a.name AS area_name,
         a.code AS area_code,
         a.status AS area_status,
         uaa.assigned_at,
         COUNT(DISTINCT c.id) AS total_customers,
         COUNT(DISTINCT s.id) AS total_subscriptions,
         COUNT(DISTINCT i.id) AS total_installments,
         COALESCE(SUM(i.installment_amount), 0) AS total_installment_amount,
         COALESCE(SUM(p.total_paid), 0) AS total_paid_amount,
         COALESCE(
           SUM(GREATEST(0, (i.installment_amount - IFNULL(p.total_paid, 0)))),
           0
         ) AS total_pending_amount,
         COALESCE(
           SUM(
             CASE 
               WHEN DATE(i.due_date) = CURDATE() AND IFNULL(p.total_paid, 0) < i.installment_amount 
               THEN (i.installment_amount - IFNULL(p.total_paid, 0))
               ELSE 0 
             END
           ),
           0
         ) AS today_due_amount,
         COALESCE(
           SUM(
             CASE 
               WHEN DATE(i.due_date) < CURDATE() AND IFNULL(p.total_paid, 0) < i.installment_amount 
               THEN (i.installment_amount - IFNULL(p.total_paid, 0))
               ELSE 0 
             END
           ),
           0
         ) AS overdue_amount,
         COALESCE(SUM(p.today_collection), 0) AS today_collection
       FROM user_area_assignments uaa
       JOIN areas a ON a.id = uaa.area_id
       LEFT JOIN chit_customers c ON c.area_id = a.id
       LEFT JOIN chit_customer_subscriptions s ON s.customer_id = c.id
       LEFT JOIN chit_customer_installments i ON i.subscription_id = s.id
       LEFT JOIN (
         SELECT 
           pa.installment_id,
           SUM(pa.allocated_amount) AS total_paid,
           SUM(
             CASE 
               WHEN DATE(cp.payment_datetime) = CURDATE() 
               THEN pa.allocated_amount 
               ELSE 0 
             END
           ) AS today_collection
         FROM chit_payment_allocations pa
         JOIN chit_collections_payments cp ON cp.id = pa.payment_id
         GROUP BY pa.installment_id
       ) p ON p.installment_id = i.id
       WHERE ${whereClause}
       GROUP BY a.id, uaa.assigned_at
       ORDER BY a.name ASC`,
      params
    );

    const formattedAreas = areaRows.map((r) => {
      const totAmt = Number(r.total_installment_amount || 0);
      const totPaid = Number(r.total_paid_amount || 0);
      return {
        area_id: r.area_id,
        area_name: r.area_name,
        area_code: r.area_code,
        area_status: r.area_status,
        assigned_at: r.assigned_at,
        total_customers: Number(r.total_customers || 0),
        total_subscriptions: Number(r.total_subscriptions || 0),
        total_installments: Number(r.total_installments || 0),
        total_amount: Number(totAmt.toFixed(2)),
        total_paid: Number(totPaid.toFixed(2)),
        total_pending: Number(Number(r.total_pending_amount || 0).toFixed(2)),
        today_due_amount: Number(Number(r.today_due_amount || 0).toFixed(2)),
        today_collection: Number(Number(r.today_collection || 0).toFixed(2)),
        overdue_amount: Number(Number(r.overdue_amount || 0).toFixed(2)),
        recovery_rate:
          totAmt > 0 ? Number(((totPaid / totAmt) * 100).toFixed(2)) : 0,
      };
    });

    const grandSummary = formattedAreas.reduce(
      (acc, a) => {
        acc.total_assigned_areas += 1;
        acc.total_customers += a.total_customers;
        acc.total_subscriptions += a.total_subscriptions;
        acc.total_amount += a.total_amount;
        acc.total_paid += a.total_paid;
        acc.total_pending += a.total_pending;
        acc.today_due_amount += a.today_due_amount;
        acc.today_collection += a.today_collection;
        acc.overdue_amount += a.overdue_amount;
        return acc;
      },
      {
        total_assigned_areas: 0,
        total_customers: 0,
        total_subscriptions: 0,
        total_amount: 0,
        total_paid: 0,
        total_pending: 0,
        today_due_amount: 0,
        today_collection: 0,
        overdue_amount: 0,
        recovery_rate: 0,
      }
    );

    grandSummary.total_amount = Number(grandSummary.total_amount.toFixed(2));
    grandSummary.total_paid = Number(grandSummary.total_paid.toFixed(2));
    grandSummary.total_pending = Number(grandSummary.total_pending.toFixed(2));
    grandSummary.today_due_amount = Number(grandSummary.today_due_amount.toFixed(2));
    grandSummary.today_collection = Number(grandSummary.today_collection.toFixed(2));
    grandSummary.overdue_amount = Number(grandSummary.overdue_amount.toFixed(2));
    grandSummary.recovery_rate =
      grandSummary.total_amount > 0
        ? Number(
            (
              (grandSummary.total_paid / grandSummary.total_amount) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,
      message: "Assigned areas collection summary retrieved successfully",
      target_user_id: targetUserId,
      summary: grandSummary,
      data: formattedAreas,
    });
  } catch (err) {
    console.error("getMyAssignedAreasCollectionsSummary Error:", err);
    return res.status(500).json({
      success: false,
      message:
        err.message || "Failed to retrieve assigned areas collection summary",
    });
  }
};

/**
 * ============================================================================
 * 4. GET AREA-WISE DUE LIST TREE
 * GET /api/installments/due/area-tree
 * ============================================================================
 * Returns hierarchical tree:
 *   Area -> Customers -> Subscriptions -> Installments -> Payments
 */
export const getAreaWiseDueListTree = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      area_id,
      area_ids,
      status = "all",
      type = "all",
      date,
      from,
      to,
      search,
      user_id,
      batch_id,
      plan_id,
    } = req.query;

    const { isAdmin, effectiveUserId, condition, params: scopeParams } =
      await getCollectorAssignmentScope(db, authUserId, user_id, "all");

    const { filterSql, filterParams } = buildInstallmentQueryFilters({
      area_id,
      area_ids,
      batch_id,
      plan_id,
      date,
      from,
      to,
      type,
      search,
    });

    const query = `
      SELECT
        i.id AS installment_id,
        i.subscription_id,
        i.installment_number,
        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
        i.installment_amount,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.place,
        c.door_no,
        c.address,
        c.state,
        c.district,
        c.pincode,
        c.aadhar,
        c.pan_number,

        COALESCE(a.id, 0) AS area_id,
        COALESCE(a.name, 'Unassigned Area') AS area_name,
        COALESCE(a.code, 'NONE') AS area_code,

        b.id AS batch_id,
        b.batch_name,
        p2.id AS plan_id,
        p2.plan_name,

        cp.id AS payment_id,
        DATE_FORMAT(cp.payment_datetime, '%Y-%m-%d %H:%i:%s') AS payment_datetime,
        cp.pay_upi,
        cp.pay_cash,
        cp.pay_cheque,
        cp.pay_upi_reference,
        cp.total_amount,
        pa.allocated_amount

      FROM chit_customer_installments i
      JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
      JOIN chit_customers c ON c.id = s.customer_id
      LEFT JOIN areas a ON a.id = c.area_id
      JOIN batches b ON b.id = s.batch_id
      JOIN plans p2 ON p2.id = s.plan_id

      LEFT JOIN chit_payment_allocations pa ON pa.installment_id = i.id
      LEFT JOIN chit_collections_payments cp ON cp.id = pa.payment_id

      WHERE 1=1
      ${condition}
      ${filterSql}

      ORDER BY COALESCE(a.name, 'Unassigned Area') ASC, c.id ASC, i.subscription_id ASC, i.due_date ASC, cp.payment_datetime ASC
    `;

    const allParams = [...scopeParams, ...filterParams];
    const [rows] = await db.query(query, allParams);

    // Build hierarchical tree: Area -> Customer -> Subscription -> Installment -> Payment
    const areaMap = new Map();

    const normalizedStatus = String(status).toUpperCase();

    for (const r of rows) {
      const aId = r.area_id;

      // 1. Area Level
      if (!areaMap.has(aId)) {
        areaMap.set(aId, {
          area_id: aId,
          area_name: r.area_name,
          area_code: r.area_code,
          customers: new Map(),
          total_customers: 0,
          total_installments: 0,
          total_amount: 0,
          total_paid: 0,
          total_pending: 0,
          today_collection: 0,
          overdue_amount: 0,
        });
      }
      const areaNode = areaMap.get(aId);

      // 2. Customer Level
      if (!areaNode.customers.has(r.customer_id)) {
        areaNode.customers.set(r.customer_id, {
          customer_id: r.customer_id,
          customer_name: r.customer_name,
          phone: r.phone,
          place: r.place,
          door_no: r.door_no,
          address: r.address,
          state: r.state,
          district: r.district,
          pincode: r.pincode,
          aadhar: r.aadhar,
          pan_number: r.pan_number,
          subscriptions: new Map(),
        });
      }
      const customerNode = areaNode.customers.get(r.customer_id);

      // 3. Subscription Level
      if (!customerNode.subscriptions.has(r.subscription_id)) {
        customerNode.subscriptions.set(r.subscription_id, {
          subscription_id: r.subscription_id,
          batch_id: r.batch_id,
          batch_name: r.batch_name,
          plan_id: r.plan_id,
          plan_name: r.plan_name,
          installments: new Map(),
        });
      }
      const subNode = customerNode.subscriptions.get(r.subscription_id);

      // 4. Installment Level
      if (!subNode.installments.has(r.installment_id)) {
        subNode.installments.set(r.installment_id, {
          installment_id: r.installment_id,
          installment_number: r.installment_number,
          due_date: r.due_date,
          installment_amount: Number(r.installment_amount || 0),
          paid_amount: 0,
          pending_amount: Number(r.installment_amount || 0),
          status: "PENDING",
          upi_amount: 0,
          cash_amount: 0,
          cheque_amount: 0,
          today_collection: 0,
          payments: [],
        });
      }
      const instNode = subNode.installments.get(r.installment_id);

      // 5. Payment Details
      if (r.payment_id) {
        const alloc = Number(r.allocated_amount || 0);
        const tot = Number(r.total_amount || 0) || 1;
        const upi = (Number(r.pay_upi || 0) * alloc) / tot;
        const cash = (Number(r.pay_cash || 0) * alloc) / tot;
        const cheque = (Number(r.pay_cheque || 0) * alloc) / tot;

        instNode.paid_amount += alloc;
        instNode.pending_amount = Math.max(
          0,
          instNode.installment_amount - instNode.paid_amount
        );
        instNode.upi_amount += upi;
        instNode.cash_amount += cash;
        instNode.cheque_amount += cheque;

        const isTodayPayment =
          r.payment_datetime &&
          r.payment_datetime.slice(0, 10) ===
            new Date().toISOString().slice(0, 10);
        if (isTodayPayment) {
          instNode.today_collection += alloc;
        }

        instNode.payments.push({
          payment_id: r.payment_id,
          payment_datetime: r.payment_datetime,
          allocated_amount: alloc,
          pay_upi: Number(r.pay_upi || 0),
          pay_cash: Number(r.pay_cash || 0),
          pay_cheque: Number(r.pay_cheque || 0),
          pay_upi_reference: r.pay_upi_reference,
        });
      }

      // Determine Installment status
      if (instNode.paid_amount >= instNode.installment_amount) {
        instNode.status = "PAID";
      } else if (new Date(instNode.due_date) < new Date(new Date().setHours(0, 0, 0, 0))) {
        instNode.status = "OVERDUE";
      } else {
        instNode.status = "PENDING";
      }
    }

    // Now convert Maps to Arrays and apply status filter if needed
    const resultTree = [];

    for (const area of areaMap.values()) {
      const customersArr = [];

      for (const cust of area.customers.values()) {
        const subsArr = [];

        for (const sub of cust.subscriptions.values()) {
          let instsArr = Array.from(sub.installments.values());

          // Apply status filter
          if (normalizedStatus !== "ALL") {
            if (normalizedStatus === "TODAY") {
              const todayStr = new Date().toISOString().slice(0, 10);
              instsArr = instsArr.filter(
                (i) => i.due_date === todayStr && i.status !== "PAID"
              );
            } else {
              instsArr = instsArr.filter((i) => i.status === normalizedStatus);
            }
          }

          if (instsArr.length > 0) {
            // Aggregate totals up into area
            for (const inst of instsArr) {
              area.total_installments += 1;
              area.total_amount += inst.installment_amount;
              area.total_paid += inst.paid_amount;
              area.total_pending += inst.pending_amount;
              area.today_collection += inst.today_collection;
              if (inst.status === "OVERDUE") {
                area.overdue_amount += inst.pending_amount;
              }
            }

            subsArr.push({
              subscription_id: sub.subscription_id,
              batch_id: sub.batch_id,
              batch_name: sub.batch_name,
              plan_id: sub.plan_id,
              plan_name: sub.plan_name,
              installments: instsArr,
            });
          }
        }

        if (subsArr.length > 0) {
          customersArr.push({
            customer_id: cust.customer_id,
            customer_name: cust.customer_name,
            phone: cust.phone,
            place: cust.place,
            door_no: cust.door_no,
            address: cust.address,
            state: cust.state,
            district: cust.district,
            pincode: cust.pincode,
            aadhar: cust.aadhar,
            pan_number: cust.pan_number,
            subscriptions: subsArr,
          });
        }
      }

      if (customersArr.length > 0) {
        area.total_customers = customersArr.length;
        area.total_amount = Number(area.total_amount.toFixed(2));
        area.total_paid = Number(area.total_paid.toFixed(2));
        area.total_pending = Number(area.total_pending.toFixed(2));
        area.today_collection = Number(area.today_collection.toFixed(2));
        area.overdue_amount = Number(area.overdue_amount.toFixed(2));
        area.recovery_rate =
          area.total_amount > 0
            ? Number(((area.total_paid / area.total_amount) * 100).toFixed(2))
            : 0;

        resultTree.push({
          area_id: area.area_id,
          area_name: area.area_name,
          area_code: area.area_code,
          metrics: {
            total_customers: area.total_customers,
            total_installments: area.total_installments,
            total_amount: area.total_amount,
            total_paid: area.total_paid,
            total_pending: area.total_pending,
            today_collection: area.today_collection,
            overdue_amount: area.overdue_amount,
            recovery_rate: area.recovery_rate,
          },
          customers: customersArr,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Area-wise collection tree retrieved successfully",
      filter: {
        status,
        type,
        date: date || null,
        from: from || null,
        to: to || null,
        search: search || null,
        area_id: area_id || null,
      },
      total_areas: resultTree.length,
      data: resultTree,
    });
  } catch (err) {
    console.error("getAreaWiseDueListTree Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve area-wise collection tree",
    });
  }
};
