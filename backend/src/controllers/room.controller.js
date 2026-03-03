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

    // 3 random bytes = 6 hex chars (e.g., "A3F1B2")
    const roomCode = crypto.randomBytes(3).toString("hex").toUpperCase();

    const room = await Room.create({
        roomCode,
        host: req.user._id,
        problemId,
        participants: [req.user._id]  // host is auto-added as first participant
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

    const room = await Room.findOne({ 
        roomCode: roomCode.trim().toUpperCase(), 
        isActive: true 
    });

    if (!room) {
        throw new ApiError(404, "This room does not exist or has been closed");
    }

    // prevent duplicate entries on page refresh
    const isAlreadyParticipant = room.participants.includes(req.user._id);

    if (!isAlreadyParticipant) {
        room.participants.push(req.user._id);
        await room.save();
    }

    return res.status(200).json(
        new ApiResponse(200, room, "Successfully joined the room")
    );
});

const getRoomDetails = asyncHandler(async (req, res) => {
    const { roomCode } = req.params;

    // populate usernames so the teacher's leaderboard can display them
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase(), isActive: true })
        .populate("host", "username email")
        .populate("participants", "username email");

    if (!room) {
        throw new ApiError(404, "Room not found or inactive");
    }

    return res.status(200).json(
        new ApiResponse(200, room, "Room details fetched")
    );
});

export { createRoom, joinRoom, getRoomDetails };