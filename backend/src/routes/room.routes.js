import { Router } from "express";
import { createRoom, joinRoom, getRoomDetails } from "../controllers/room.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/create").post(createRoom);              // teacher creates a room linked to a problem
router.route("/join").post(joinRoom);                   // student joins using a 6-char room code
router.route("/details/:roomCode").get(getRoomDetails); // IDE fetches room data to determine host vs student

export default router;