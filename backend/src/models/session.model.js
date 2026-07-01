import mongoose, { Schema } from "mongoose";

const sessionSchema = new Schema(
    {
        sessionCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        interviewer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Guest candidate info — no User account required
        candidate: {
            name: { type: String, default: null },
            guestToken: { type: String, default: null },
        },
        status: {
            type: String,
            enum: ["waiting", "active", "ended"],
            default: "waiting",
        },
        problemIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "Problem",
            },
        ],
        activeProblem: {
            type: Schema.Types.ObjectId,
            ref: "Problem",
            default: null,
        },
        // Periodically snapshotted for resume-on-reload (future use)
        codeSnapshot: {
            type: String,
            default: "",
        },
        startedAt: { type: Date, default: null },
        endedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export const Session = mongoose.model("Session", sessionSchema);
