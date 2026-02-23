import mongoose, { Schema } from "mongoose";

const roomSchema = new Schema(
    {
        roomCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true // Optimized for fast lookups during join
        },
        host: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        problemId: {
            type: Schema.Types.ObjectId,
            ref: "Problem",
            required: true
        },
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
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