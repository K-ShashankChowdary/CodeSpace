import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Room } from "../models/room.model.js";
import crypto from "crypto";

const createRoom = asyncHandler(async (req, res) => {
    const { problemId } = req.body;

    if (!problemId) {
        throw new ApiError(400, "Problem selection is mandatory to start a room");
    }

    // Generating a unique 6-character hex code for students to join
    const roomCode = crypto.randomBytes(3).toString("hex").toUpperCase();

    const room = await Room.create({
        roomCode,
        host: req.user._id,
        problemId,
        participants: [req.user._id] // Host is added as the first participant by default
    });

    return res.status(201).json(
        new ApiResponse(201, room, "Room initialized successfully")
    );
});

const joinRoom = asyncHandler(async (req, res) => {
    const { roomCode } = req.body;

    if (!roomCode) {
        throw new ApiError(400, "Please provide a valid room code");
    }

    // Looking for an active session matching the code
    const room = await Room.findOne({ 
        roomCode: roomCode.trim().toUpperCase(), 
        isActive: true 
    });

    if (!room) {
        throw new ApiError(404, "This room does not exist or has been closed");
    }

    // Checking if user is already in the list to avoid duplicates
    const isAlreadyParticipant = room.participants.includes(req.user._id);

    if (!isAlreadyParticipant) {
        room.participants.push(req.user._id);
        await room.save();
    }

    return res.status(200).json(
        new ApiResponse(200, room, "Successfully joined the room")
    );
});

export { createRoom, joinRoom };