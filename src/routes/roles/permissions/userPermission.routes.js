import express from "express";
import {
  saveUserPermissions,
  getUserPermissionsById,
  updatetoggleUserPermission
} from "../../../controllers/roles/permissions/userPermission.controller.js";

const router = express.Router();

// ✅ Save (bulk)
router.post("/save", saveUserPermissions);

// ✅ Get user permissions
router.get("/:user_id", getUserPermissionsById);

// ✅ Toggle single permission
router.post("/toggle", updatetoggleUserPermission);

export default router;