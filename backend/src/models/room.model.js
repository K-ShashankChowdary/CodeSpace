import mongoose, { Schema } from "mongoose";

const roomSchema = new Schema(
    {
        roomCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true
        },
        host: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        problems: [
            {
                type: Schema.Types.ObjectId,
                ref: "Problem"
            }
        ],
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        // 🚨 NEW: Stores persistent progress for the leaderboard
        studentProgress: [
            {
                studentId: { type: Schema.Types.ObjectId, ref: "User" },
                // Map of ProblemId -> Status (e.g., "AC", "WA")
                results: { type: Map, of: String, default: {} }
            }
        ],
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

export const Room = mongoose.model("Room", roomSchema);