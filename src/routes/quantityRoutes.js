import express from "express";
import {
  createQuantity,
  getAllQuantities,
  getQuantityById,
  updateQuantity,
  deleteQuantity,
} from "../controllers/quantityController.js";

const router = express.Router();

router.post("/", createQuantity);
router.get("/", getAllQuantities);
router.get("/:id", getQuantityById);
router.put("/:id", updateQuantity);
router.delete("/:id", deleteQuantity);

export default router;
