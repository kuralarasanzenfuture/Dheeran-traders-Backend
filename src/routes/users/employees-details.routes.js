import express from "express";
import {
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  getEmployees,
  updateEmployee,
} from "../../controllers/users/employees-details.controller.js";

import { employeeDocsUpload } from "../../middlewares/uploadEmployeeDocs.js";
import { validateEmployee } from "../../middlewares/employeeValidation.middleware.js";
import { createEmployeeSchema, updateEmployeeSchema } from "../../validations/employee.validation.js";
import { validate } from "../../middlewares/validate.middleware.js";

const router = express.Router();

// router.post("/", employeeDocsUpload, validate(createEmployeeSchema),  createEmployee);
router.post("/", employeeDocsUpload,  createEmployee);

router.get("/", getEmployees);

router.get("/:id", getEmployeeById);

router.put("/:id", employeeDocsUpload,validate(updateEmployeeSchema), updateEmployee);
// router.put("/:id", employeeDocsUpload, updateEmployee);

router.delete("/:id", deleteEmployee);

export default router;
