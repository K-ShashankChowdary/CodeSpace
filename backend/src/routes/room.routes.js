import { Router } from "express";
import { createRoom, joinRoom, getRoomDetails } from "../controllers/room.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply authentication middleware to ensure only logged-in users access room routes
router.use(verifyJWT);

// Route for a teacher to create a new room
router.route("/create").post(createRoom);

// Route for a student to join a room using a code
router.route("/join").post(joinRoom);

// Route for the IDE to fetch room data when the page loads
router.route("/details/:roomCode").get(getRoomDetails);



export default router;