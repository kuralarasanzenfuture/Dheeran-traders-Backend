import express from "express";
import {
  createQuantity,
  getAllQuantities,
  getQuantityById,
  updateQuantity,
  deleteQuantity,
} from "../controllers/quantityController.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/",protect, createQuantity);
router.get("/",protect, getAllQuantities);
router.get("/:id",protect, getQuantityById);
router.put("/:id",protect, updateQuantity);
router.delete("/:id",protect, deleteQuantity);

export default router;
