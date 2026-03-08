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

    let roomCode;
    let room;
    for (let attempt = 0; attempt < 5; attempt++) {
        roomCode = crypto.randomBytes(3).toString("hex").toUpperCase();
        const existing = await Room.findOne({ roomCode, isActive: true });
        if (!existing) break;
        if (attempt === 4) throw new ApiError(500, "Failed to generate unique room code");
    }

    room = await Room.create({
        roomCode,
        host: req.user._id,
        problemId,
        participants: [req.user._id]  
    });

    // 🚨 FIX: Explicitly append 'teacher' role 
    const responseData = { ...room.toObject(), role: "teacher" };

    return res.status(201).json(
        new ApiResponse(201, responseData, "Room initialized successfully")
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

    const isAlreadyParticipant = room.participants.some(p => p.equals(req.user._id));

    if (!isAlreadyParticipant) {
        room.participants.push(req.user._id);
        await room.save();
    }

    // 🚨 FIX: Calculate if this user is the host or a student
    const isHost = room.host.equals(req.user._id);
    const calculatedRole = isHost ? "teacher" : "student";

    const responseData = { ...room.toObject(), role: calculatedRole };

    return res.status(200).json(
        new ApiResponse(200, responseData, "Successfully joined the room")
    );
});

const getRoomDetails = asyncHandler(async (req, res) => {
    const { roomCode } = req.params;

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

const closeRoom = asyncHandler(async (req, res) => {
    const { roomCode } = req.params;
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase(), isActive: true });

    if (!room) {
        throw new ApiError(404, "Room not found or already closed");
    }

    if (!room.host.equals(req.user._id)) {
        throw new ApiError(403, "Only the host can close the room");
    }

    room.isActive = false;
    await room.save();

    return res.status(200).json(
        new ApiResponse(200, null, "Room closed successfully")
    );
});

export { createRoom, joinRoom, getRoomDetails, closeRoom };
