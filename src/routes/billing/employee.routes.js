import express from "express";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../../controllers/billing/employeeController.js";
import { adminOnly, protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createEmployee);
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.put("/:id", protect, adminOnly, updateEmployee);
router.delete("/:id", protect, adminOnly, deleteEmployee);

export default router;
