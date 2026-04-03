import express from "express";
import {
  getAllModuleActionsTree,
  getAllModuleActionsFlat,
  getActionsByModule,
  getUserModuleActions
} from "../../controllers/roles/moduleAction.controller.js";

const router = express.Router();

router.get("/tree", getAllModuleActionsTree);
router.get("/flat", getAllModuleActionsFlat);
router.get("/module/:module_id", getActionsByModule);
router.get("/user", getUserModuleActions);

export default router;