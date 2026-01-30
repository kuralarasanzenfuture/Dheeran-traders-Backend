import express from "express";
import {
  register,
  login,
  getUsers,
  getProfile,
  deleteUser,
  updateUser,
  updateUserRole,
} from "../controllers/user.controller.js";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", protect, getProfile);
router.get("/", protect, adminOnly, getUsers);

router.put("/:id", protect, adminOnly, updateUser);
router.put("/:id/role", protect, adminOnly, updateUserRole);

router.delete("/:id", protect, adminOnly, deleteUser);

export default router;