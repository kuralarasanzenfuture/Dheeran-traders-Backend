
import express from "express";
import {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan
} from "../../controllers/chit/plan.controllers.js";
import { getPlanAmountsByPlanId } from "../../controllers/chit/planAmount.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { checkPermission } from "../../middlewares/permission/permission.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/create", createPlan);
router.get("/", getAllPlans);
router.get("/:id", getPlanById);
router.get("/:plan_id/amounts", getPlanAmountsByPlanId);
router.put("/:id", updatePlan);
router.delete("/:id", deletePlan);

export default router;