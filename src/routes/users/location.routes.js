import express from "express";
import {
  updateLocation,
  getCurrentLocation,
  getLocationHistory,
  getAllUsersCurrentLocation
} from "../../controllers/location.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/update-location", updateLocation);

router.get("/current/:user_id", getCurrentLocation);

router.get("/history/:user_id", getLocationHistory);

router.get("/all-users", getAllUsersCurrentLocation);

export default router;