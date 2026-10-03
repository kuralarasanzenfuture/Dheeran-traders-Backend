import express from "express";
import {
  createInstallments,
  getAllInstallments,
  getInstallmentsBySubscription,
  getInstallmentById,
  updateInstallment,
  deleteInstallment,
  payInstallment,
} from "../../controllers/chit/installments/customerInstallment.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import {
  getCollectionDashboard,
  getCollectorDueList,
  getCollectorDueListByDate,
  getCollectorDueListByDateandTypeandRange,
  getCollectorDueListTree,
  getOverdueInstallments,
  getPriorityDueList,
  getTodayDueList,
  getTodayDueSummary,
  getAreaWiseAssignedCollections,
  getAreaDueList,
  getMyAssignedAreasCollectionsSummary,
  getAreaWiseDueListTree,
} from "../../controllers/chit/installments/getcustomerInstallment.controller.js";

const router = express.Router();

// 🔒 All routes require valid JWT authentication
router.use(verifyToken);

// ============================================================================
// 1. CREATE INSTALLMENTS
// ============================================================================
router.post("/create", createInstallments);

// ============================================================================
// 2. GENERAL READ & GLOBAL DUE LISTS
// ============================================================================
router.get("/", getAllInstallments);
router.get("/due/today/summary", getTodayDueSummary);
router.get("/due/today", getTodayDueList);
router.get("/due/overdue", getOverdueInstallments);

// ============================================================================
// 3. AREA-WISE ASSIGNED COLLECTIONS & DUES (NEW 🔥)
// ============================================================================
/**
 * GET /api/installments/due/area-wise
 * GET /api/installments/due/areas
 * GET /api/installments/area-wise/collections
 * - Collections aggregated area by area with totals, pending, paid, recovery rate.
 * - Supports filters: area_id, area_ids, status, type, date, from, to, search, user_id, include_installments=true.
 */
router.get("/due/area-wise", getAreaWiseAssignedCollections);
router.get("/due/areas", getAreaWiseAssignedCollections);
router.get("/area-wise/collections", getAreaWiseAssignedCollections);

/**
 * GET /api/installments/due/assigned-areas
 * GET /api/installments/assigned-areas
 * - Returns list of areas assigned to the logged-in collector (or target user for Admin)
 *   with current collection performance metrics.
 */
router.get("/due/assigned-areas", getMyAssignedAreasCollectionsSummary);
router.get("/assigned-areas", getMyAssignedAreasCollectionsSummary);

/**
 * GET /api/installments/due/area-tree
 * GET /api/installments/area-tree
 * - Hierarchical structure: Area -> Customers -> Subscriptions -> Installments -> Payments.
 * - Supports status, type, date, from, to, search, area_id filters.
 */
router.get("/due/area-tree", getAreaWiseDueListTree);
router.get("/area-tree", getAreaWiseDueListTree);

/**
 * GET /api/installments/due/area/:area_id
 * GET /api/installments/area/:area_id/due
 * GET /api/installments/area/:area_id/collections
 * - Specific area due list with customer & payment breakdown, summary, and pagination.
 * - Non-admin collectors can only access their assigned areas.
 */
router.get("/due/area/:area_id", getAreaDueList);
router.get("/area/:area_id/due", getAreaDueList);
router.get("/area/:area_id/collections", getAreaDueList);

// ============================================================================
// 4. COLLECTOR ASSIGNED DUES (ENHANCED: Direct + Area Assignments)
// ============================================================================
/**
 * GET /api/installments/due/collector/bydate/:date
 * - Returns collector dues for a specific date (supports area_id & search filters).
 */
router.get("/due/collector/bydate/:date", getCollectorDueListByDate);

/**
 * GET /api/installments/due/collector/bydate
 * GET /api/installments/due/collector/filter
 * GET /api/installments/due/collector/range
 * - Filter collector dues by exact date, date range (from & to), or type (today, overdue, upcoming).
 * - Supports area_id, area_ids, search, batch_id, plan_id, user_id.
 */
router.get("/due/collector/bydate", getCollectorDueListByDateandTypeandRange);
router.get("/due/collector/filter", getCollectorDueListByDateandTypeandRange);
router.get("/due/collector/range", getCollectorDueListByDateandTypeandRange);

/**
 * GET /api/installments/due/collector
 * - Full collector due list (includes customers from direct & area assignments).
 * - Filters: area_id, area_ids, status (paid, pending, overdue, today), type, search, page, limit.
 */
router.get("/due/collector", getCollectorDueList);

/**
 * GET /api/installments/due/collector-tree
 * - Collector hierarchical tree (Customer -> Subscriptions -> Installments -> Payments).
 * - Filters: area_id, status, search, batch_id, plan_id.
 */
router.get("/due/collector-tree", getCollectorDueListTree);

/**
 * GET /api/installments/due/priority
 * - Priority-ordered collector due list (overdue first, then today, then upcoming).
 * - Filters: area_id, search, user_id.
 */
router.get("/due/priority", getPriorityDueList);

/**
 * GET /api/installments/dashboard/collection
 * - Collection dashboard summary for collector / admin.
 * - Filters: area_id, user_id.
 */
router.get("/dashboard/collection", getCollectionDashboard);

// ============================================================================
// 5. SUBSCRIPTION INSTALLMENTS & SINGLE INSTALLMENT READ
// ============================================================================
router.get("/subscription/:subscription_id", getInstallmentsBySubscription);
router.get("/:id", getInstallmentById);

// ============================================================================
// 6. UPDATE & DELETE
// ============================================================================
router.put("/:id", updateInstallment);
router.delete("/:id", deleteInstallment);

// ============================================================================
// 7. PAYMENT
// ============================================================================
router.post("/pay/:id", payInstallment);

export default router;
