import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Room } from "../models/room.model.js";
import crypto from "crypto";

// Handle the creation of a new classroom/room
const createRoom = asyncHandler(async (req, res) => {
    const { problemId } = req.body;

    // Ensure a problem is selected before creating a room
    if (!problemId) {
        throw new ApiError(400, "Problem selection is mandatory to start a room");
    }

    // Generate a unique 6-character hex code for students to join
    const roomCode = crypto.randomBytes(3).toString("hex").toUpperCase();

    // Create the room document in the database
    const room = await Room.create({
        roomCode,
        host: req.user._id, // The user creating the room is assigned as the host
        problemId,
        participants: [req.user._id] // Automatically add the host as the first participant
    });

    return res.status(201).json(
        new ApiResponse(201, room, "Room initialized successfully")
    );
});

// Handle the logic for a student joining an existing room
const joinRoom = asyncHandler(async (req, res) => {
    const { roomCode } = req.body;

    if (!roomCode) {
        throw new ApiError(400, "Please provide a valid room code");
    }

    // Look for an active session matching the provided room code
    const room = await Room.findOne({ 
        roomCode: roomCode.trim().toUpperCase(), 
        isActive: true 
    });

    // If no room is found or it has been closed, throw a 404 error
    if (!room) {
        throw new ApiError(404, "This room does not exist or has been closed");
    }

    // Check if the user is already in the participants list to avoid duplicates
    const isAlreadyParticipant = room.participants.includes(req.user._id);

    if (!isAlreadyParticipant) {
        room.participants.push(req.user._id);
        await room.save();
    }

    return res.status(200).json(
        new ApiResponse(200, room, "Successfully joined the room")
    );
});

// Fetch specific room details so the IDE can identify the host and students
const getRoomDetails = asyncHandler(async (req, res) => {
    const { roomCode } = req.params;

    // Find the room and populate the username and email for the host and participants
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


// Export all room controller functions
export { createRoom, joinRoom, getRoomDetails };