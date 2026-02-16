import mongoose, { Schema } from "mongoose";

const submissionSchema = new Schema(
    {
        problemId: {
            type: Schema.Types.ObjectId,
            ref: "Problem", // References the Problem model
            required: true,
        },
        language: {
            type: String,
            required: true,
            enum: ["cpp", "python", "java"], // Restrict to supported languages
        },
        code: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "AC", "WA", "TLE", "MLE", "CE", "RE"],
            default: "Pending",
        },
        output: {
            type: String, // Stores execution output or error message
        },
    },
    { timestamps: true }
);

export const Submission = mongoose.model("Submission", submissionSchema);