import express from "express";
import {
  createChitCustomer,
  getChitCustomers,
  getChitCustomerById,
  updateChitCustomer,
  deleteChitCustomer,
} from "../../controllers/chit/chitCustomer.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", createChitCustomer);
router.get("/", getChitCustomers);
router.get("/:id", getChitCustomerById);
router.put("/:id", updateChitCustomer);
router.delete("/:id", deleteChitCustomer);

export default router;