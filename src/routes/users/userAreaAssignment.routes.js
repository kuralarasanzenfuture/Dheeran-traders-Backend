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

// 4. Get areas assigned to a specific user
router.get("/user/:userId", getAreasByUserId);

// 5. Get users assigned to a specific area
router.get("/area/:areaId", getUsersByAreaId);

// 6. Get single assignment by ID
router.get("/:id", getAssignmentById);

// 7. Update assignment details
router.put("/:id", updateAssignment);
router.patch("/:id", updateAssignment);

// 8. Toggle / set status (is_active)
router.patch("/:id/status", toggleAssignmentStatus);

// 9. Delete assignment (soft delete by default, ?hard=true for permanent delete)
router.delete("/:id", deleteAssignment);

// 10. Unassign specific user from specific area
router.delete("/user/:userId/area/:areaId", unassignUserFromArea);

export default router;
