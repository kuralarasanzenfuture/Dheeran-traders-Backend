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

router.use(protect);

router.post("/", createEmployee);
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.put("/:id", adminOnly, updateEmployee);
router.delete("/:id", adminOnly, deleteEmployee);

export default router;
