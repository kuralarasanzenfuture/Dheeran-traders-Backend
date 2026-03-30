import express from "express";
import {
  getAllModulesTree,
  getAllModulesFlat,
  getModulesByParent,
  getUserModules
} from "../../controllers/roles/module.controller.js";

const router = express.Router();

// Sidebar
router.get("/tree", getAllModulesTree);

// Admin
router.get("/flat", getAllModulesFlat);

// Dynamic
router.get("/parent/:parent_id", getModulesByParent);

// User permission based
router.get("/user", getUserModules);

export default router;