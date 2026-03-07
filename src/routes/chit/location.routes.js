import express from "express";
import { getUserLocation, updateLocation } from "../../controllers/chit/location.controller.js";

const router = express.Router();

router.post("/update-location", updateLocation);

router.get("/:user_id", getUserLocation);

export default router;