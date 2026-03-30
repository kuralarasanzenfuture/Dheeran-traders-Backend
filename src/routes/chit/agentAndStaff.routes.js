import express from "express";
import {
  createAgentStaff,
  getAgentStaff,
  getAgentStaffById,
  updateAgentStaff,
  deleteAgentStaff
} from "../../controllers/chit/agentAndStaff.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/create", createAgentStaff);
router.get("/", getAgentStaff);
router.get("/:id", getAgentStaffById);
router.put("/:id", updateAgentStaff);
router.delete("/:id", deleteAgentStaff);

export default router;