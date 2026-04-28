import express from "express";
import {
  getAllAudits,
  getAuditByRecord,
  getAuditByTable,
  getAuditByUser,
  replayAudit,
} from "../../controllers/audits/auditsLog.controller.js";

const router = express.Router();

// 📚 Get all audit logs (with filters)
router.get("/", getAllAudits);

// 🔍 Get all logs for a record
router.get("/record/:table/:id", getAuditByRecord);

// 📋 Get all logs for a table
router.get("/table/:table", getAuditByTable);

// 👤 Get logs by user
router.get("/user/:userId", getAuditByUser);

// 🔁 Replay state (time-based)
router.get("/replay/:table/:id", replayAudit);



export default router;