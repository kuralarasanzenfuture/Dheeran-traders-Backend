import express from "express";
import {
  createUser,
  loginUser,
  logoutUser,
  refreshToken,
  deleteUser,
  logoutAllDevices,
} from "../../controllers/roles/user.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", createUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", logoutUser);
router.post("/logout-all", verifyToken, logoutAllDevices);
router.delete("/delete/:id", deleteUser);

export default router;
