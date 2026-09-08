import express from "express";
import {
  createPlanRule,
  updatePlanRule,
  deletePlanRule,
  getPlanRules,
  getPlanRuleById
} from "../../controllers/chit/planRules.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/create", createPlanRule);

router.get("/", getPlanRules);

router.get("/:id", getPlanRuleById);

router.put("/update/:id", updatePlanRule);

router.delete("/delete/:id", deletePlanRule);

export default router;