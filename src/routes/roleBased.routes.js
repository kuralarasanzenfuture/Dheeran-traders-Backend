import express from "express";
import {
  createRole,
  getAllRoles,
  updateRole,
  deleteRole
} from "../controllers/roleBased.controller.js";

const router = express.Router();

router.post("/", createRole);
router.get("/", getAllRoles);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;