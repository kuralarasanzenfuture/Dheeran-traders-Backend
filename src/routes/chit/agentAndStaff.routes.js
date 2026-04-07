import express from "express";
import {
  createAgentStaff,
  getAgentStaff,
  getAgentStaffById,
  updateAgentStaff,
  deleteAgentStaff
} from "../../controllers/chit/agentAndStaff.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { checkPermission } from "../../middlewares/permission/permission.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/create", checkPermission("CHIT_AGENT", "CREATE"), createAgentStaff);
router.get("/", checkPermission("CHIT_AGENT", "VIEW"), getAgentStaff);
router.get("/:id", getAgentStaffById);
router.put("/:id", checkPermission("CHIT_AGENT", "EDIT"), updateAgentStaff);
router.delete("/:id",checkPermission("CHIT_AGENT", "DELETE"), deleteAgentStaff);

export default router;