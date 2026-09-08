import express from "express";
import {
  assignRolePermissions,
  assignUserPermissions,
  getRolePermissions,
  getUserPermissions
} from "../controllers/permissions.controller.js";

const router = express.Router();

/* ROLE */
router.post("/roles/permissions", assignRolePermissions);
router.get("/roles/:role_id/permissions", getRolePermissions);

/* USER */
router.post("/users/permissions", assignUserPermissions);
router.get("/users/:user_id/permissions", getUserPermissions);

export default router;