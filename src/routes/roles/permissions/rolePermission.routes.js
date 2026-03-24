import express from "express";
import {
  saveRolePermissions,
  getRolePermissionsById,
  updatetogglePermission
} from "../../../controllers/roles/permissions/rolePermission.controller.js";

const router = express.Router();

// Save all permissions
router.post("/save", saveRolePermissions);

// Get permissions by role
router.get("/:role_id", getRolePermissionsById);

// Toggle single permission
router.post("/toggle", updatetogglePermission);

export default router;