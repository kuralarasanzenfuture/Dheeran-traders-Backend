import express from "express";
import {
  createRole,
  getAllRoles,
  updateRole,
  deleteRole,
  updateRoleStatus
} from "../../controllers/roles/roles.controller.js";

const router = express.Router();

router.post("/", createRole);
router.get("/", getAllRoles);
router.put("/:id", updateRole);
router.patch("/status/:id", updateRoleStatus);
router.delete("/:id", deleteRole);

export default router;