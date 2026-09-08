import express from "express";
import {
  saveUserPermissions,
  getUserPermissionsById,
  updatetoggleUserPermission,
  getUserOverridePermissions
} from "../../../controllers/roles/permissions/userPermission.controller.js";

const router = express.Router();

// ✅ Save (bulk)
router.post("/save", saveUserPermissions);

// ✅ Full permissions (role + override)
router.get("/:user_id", getUserPermissionsById);

// ✅ 🔥 ONLY override data
router.get("/:user_id/overrides", getUserOverridePermissions);

// ✅ Toggle single permission
router.post("/toggle", updatetoggleUserPermission);

export default router;