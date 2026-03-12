import mongoose, { Schema } from "mongoose";

const roomSchema = new Schema(
    {
        roomCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true         // indexed for fast lookups when students join
        },
        host: {
            type: Schema.Types.ObjectId,
            ref: "User",        // the teacher who created this room
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
                ref: "User"     // all users in the room (host + students)
            }
        ],
        isActive: {
            type: Boolean,
            default: true       // set to false when the teacher closes the room
        }
    },
    { timestamps: true }
);

export const Room = mongoose.model("Room", roomSchema);