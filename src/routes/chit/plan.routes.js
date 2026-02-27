
import express from "express";
import {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan
} from "../../controllers/chit/plan.controllers.js";

const router = express.Router();

router.post("/create", createPlan);
router.get("/", getAllPlans);
router.get("/:id", getPlanById);
router.put("/:id", updatePlan);
router.delete("/:id", deletePlan);

export default router;