import express from "express";
import {
  assignUserToArea,
  getUserAreaAssignments,
  getMyAssignedAreas,
  getAssignmentById,
  getAreasByUserId,
  getUsersByAreaId,
  updateAssignment,
  toggleAssignmentStatus,
  deleteAssignment,
  unassignUserFromArea,
  getUserAssignedAreaCustomers,
  getAreaCustomersByAreaId,
  getAreaCustomersByUserId,
  getAreaAssignedCollections,
  getUserAssignedAreaBillingCustomers,
  getAreaBillingCustomersByAreaId,
  getAreaBillingCustomersByUserId,
  getAreaAssignedBillingCollections,
} from "../../controllers/users/userAreaAssignment.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// 🔒 Protect all assignment routes with JWT authentication
router.use(verifyToken);

// 1. Assign user to area (single, bulk areas to user, bulk users to area)
router.post("/", assignUserToArea);
router.post("/assign", assignUserToArea);

// 2. Get all assignments (supports user_id, area_id, status, is_active, search, page, limit)
router.get("/", getUserAreaAssignments);

// 3. Get my assigned areas (for currently logged-in user / field staff)
router.get("/my-areas", getMyAssignedAreas);

// 4. Get chit customers residing in logged-in user's assigned areas
// References user_chit_customer_assignments to show direct assignments & chit dues
// (Also delegates to billing customers if ?customer_type=billing is passed)
router.get("/my-customers", getUserAssignedAreaCustomers);
router.get("/customers", getUserAssignedAreaCustomers);
router.get("/my-chit-customers", getUserAssignedAreaCustomers);
router.get("/chit-customers", getUserAssignedAreaCustomers);

// 5. Get billing customers residing in logged-in user's assigned areas
// References user_bill_customer_assignments (assignedBillCustomer) for direct assignment details & billing stats
router.get("/my-billing-customers", getUserAssignedAreaBillingCustomers);
router.get("/billing-customers", getUserAssignedAreaBillingCustomers);

// 6. Get chit collections & dues for logged-in user's assigned areas
router.get("/my-collections", getAreaAssignedCollections);
router.get("/collections", getAreaAssignedCollections);

// 7. Get billing collections & dues for logged-in user's assigned areas
router.get("/my-billing-collections", getAreaAssignedBillingCollections);
router.get("/billing-collections", getAreaAssignedBillingCollections);

// 8. Get areas assigned to a specific user
router.get("/user/:userId", getAreasByUserId);

// 9. Get chit customers in areas assigned to a specific user
router.get("/user/:userId/customers", getAreaCustomersByUserId);
router.get("/user/:userId/chit-customers", getAreaCustomersByUserId);

// 10. Get billing customers in areas assigned to a specific user
router.get("/user/:userId/billing-customers", getAreaBillingCustomersByUserId);

// 11. Get users assigned to a specific area
router.get("/area/:areaId", getUsersByAreaId);

// 12. Get chit customers residing in a specific area (checks user assignment permission)
router.get("/area/:areaId/customers", getAreaCustomersByAreaId);
router.get("/area/:areaId/chit-customers", getAreaCustomersByAreaId);

// 13. Get billing customers residing in a specific area (checks user assignment permission)
router.get("/area/:areaId/billing-customers", getAreaBillingCustomersByAreaId);

// 14. Get single assignment by ID
router.get("/:id", getAssignmentById);

// 15. Update assignment details
router.put("/:id", updateAssignment);
router.patch("/:id", updateAssignment);

// 16. Toggle / set status (is_active)
router.patch("/:id/status", toggleAssignmentStatus);

// 17. Delete assignment (soft delete by default, ?hard=true for permanent delete)
router.delete("/:id", deleteAssignment);

// 18. Unassign specific user from specific area
router.delete("/user/:userId/area/:areaId", unassignUserFromArea);

export default router;

