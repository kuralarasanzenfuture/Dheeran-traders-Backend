import express from "express";
import {
  register,
  login,
  getUsers,
  getProfile,
  deleteUser,
} from "../controllers/user.controller.js";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";
import { updateUserRole } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", protect, getProfile);
router.get("/", protect, adminOnly, getUsers);
router.delete("/:id", protect, adminOnly, deleteUser);

router.put("/:id/role", protect, adminOnly, updateUserRole);

export default router;
