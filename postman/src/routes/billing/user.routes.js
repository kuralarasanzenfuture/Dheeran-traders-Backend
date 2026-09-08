import express from "express";
import {
  register,
  login,
  getUsers,
  getProfile,
  deleteUser,
  updateUser,
  updateUserRole,
} from "../../controllers/billing/user.controller.js";
import { protect, adminOnly } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register",  register);
router.post("/login", login);

router.get("/me", getProfile);
router.get("/", adminOnly, getUsers);

router.put("/:id", adminOnly, updateUser);
router.put("/:id/role", adminOnly, updateUserRole);

router.delete("/:id", adminOnly, deleteUser);

export default router;
