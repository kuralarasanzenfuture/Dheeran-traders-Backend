import express from "express";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
} from "../../controllers/roles/employees-details.controller.js";

import { employeeDocsUpload } from "../../middlewares/uploadEmployeeDocs.js";
import { validateEmployee } from "../../middlewares/employeeValidation.middleware.js";

const router = express.Router();

router.post("/", employeeDocsUpload, createEmployee);
router.put("/:id", employeeDocsUpload, updateEmployee);
router.get("/", getEmployees);
router.delete("/:id", deleteEmployee);

export default router;
