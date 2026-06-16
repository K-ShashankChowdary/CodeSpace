import { Router } from "express";
import { createRoom, joinRoom, getRoomDetails, closeRoom, leaveRoom } from "../controllers/room.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/create").post(createRoom);               // interviewer creates an interview room
router.route("/join").post(joinRoom);                   // candidate joins using a 6-char room code
router.route("/details/:roomCode").get(getRoomDetails); // IDE fetches room data to determine interviewer vs candidate
router.route("/close/:roomCode").post(closeRoom);       // interviewer closes the room
router.route("/leave/:roomCode").post(leaveRoom);       // candidate leaves the room

export default router;