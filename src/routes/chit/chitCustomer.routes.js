import express from "express";
import {
  createChitCustomer,
  getChitCustomers,
  getChitCustomerById,
  updateChitCustomer,
  deleteChitCustomer,
} from "../../controllers/chit/chitCustomer.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { checkPermission } from "../../middlewares/permission/permission.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/",checkPermission("CHIT_CUSTOMERS", "CREATE"),  createChitCustomer);
router.get("/", checkPermission("CHIT_CUSTOMERS", "VIEW"), getChitCustomers);
router.get("/:id", getChitCustomerById);
router.put("/:id", checkPermission("CHIT_CUSTOMERS", "EDIT"), updateChitCustomer);
router.delete("/:id", checkPermission("CHIT_CUSTOMERS", "DELETE"), deleteChitCustomer);

export default router;