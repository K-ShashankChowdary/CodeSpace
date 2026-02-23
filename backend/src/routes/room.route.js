import { Router } from "express";
import { createRoom, joinRoom } from "../controllers/room.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Applying authentication middleware to ensure only logged-in users access rooms
router.use(verifyJWT);

router.route("/create").post(createRoom);
router.route("/join").post(joinRoom);

export default router;