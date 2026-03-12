import express from "express";
import {
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  getEmployees,
  updateEmployee,
} from "../../controllers/roles/employees-details.controller.js";

import { employeeDocsUpload } from "../../middlewares/uploadEmployeeDocs.js";
import { validateEmployee } from "../../middlewares/employeeValidation.middleware.js";

const router = express.Router();

router.post("/", employeeDocsUpload, createEmployee);

router.get("/", getEmployees);

router.get("/:id", getEmployeeById);

router.put("/:id", employeeDocsUpload, updateEmployee);

router.delete("/:id", deleteEmployee);

export default router;
