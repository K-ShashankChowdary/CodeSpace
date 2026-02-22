import mongoose, { Schema } from "mongoose";

const submissionSchema = new Schema(
    {
        problemId: {
            type: Schema.Types.ObjectId,
            ref: "Problem",
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        code: {
            type: String,
            required: true
        },
        language: {
            type: String,
            required: true
        },
        status: {
            type: String,
            default: "Pending"
        },
        output: {
            type: String
        },
        timeTaken: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export const Submission = mongoose.model("Submission", submissionSchema);