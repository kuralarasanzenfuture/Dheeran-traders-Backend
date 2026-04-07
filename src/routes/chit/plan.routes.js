
import express from "express";
import {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan
} from "../../controllers/chit/plan.controllers.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { checkPermission } from "../../middlewares/permission/permission.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/create",checkPermission("CHIT_PLANS", "CREATE"), createPlan);
router.get("/", checkPermission("CHIT_PLANS", "VIEW"), getAllPlans);
router.get("/:id", getPlanById);
router.put("/:id", checkPermission("CHIT_PLANS", "EDIT"), updatePlan);
router.delete("/:id",checkPermission("CHIT_PLANS", "DELETE"), deletePlan);

export default router;