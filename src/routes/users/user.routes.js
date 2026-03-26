import express from "express";

import { verifyToken } from "../../middlewares/auth.middleware.js";

import { createUser } from "../../controllers/users/register.controller.js";
import { loginUser } from "../../controllers/users/login.controller.js";
import { updateUser, updateUserStatus } from "../../controllers/users/update.controller.js";
import { deleteUser } from "../../controllers/users/delete.controller.js";

import {
  checkEmail,
  checkPhone,
  checkUsername,
  getAllUsers,
  getUserById
} from "../../controllers/users/getusers.controller.js";

import {
  logoutAllDevices,
  logoutUser
} from "../../controllers/users/logout.controller.js";

import { refreshToken } from "../../controllers/users/refreshToken.controller.js";

const router = express.Router();

/* =========================
   AUTH
========================= */
router.post("/register", createUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshToken);

/* =========================
   LOGOUT
========================= */
router.post("/logout", logoutUser);
router.post("/logout-all", verifyToken, logoutAllDevices);

/* =========================
   USER CRUD
========================= */
router.get("/", getAllUsers);
router.get("/:id", getUserById);

// router.put("/update/:id", verifyToken, updateUser);
// router.patch("/status/:id", verifyToken, updateUserStatus);
// router.delete("/delete/:id", verifyToken, deleteUser);

router.put("/update/:id", updateUser);
router.patch("/status/:id", updateUserStatus);
router.delete("/delete/:id", deleteUser);

/* =========================
   VALIDATION
========================= */
router.get("/check-username/:username", checkUsername);
router.get("/check-email/:email", checkEmail);
router.get("/check-phone/:phone", checkPhone);

export default router;