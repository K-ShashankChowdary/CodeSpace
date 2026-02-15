import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    code: { type: String, required: true },
    language: { type: String, required: true },
    status: { type: String, default: "Pending" },
    output: { type: String },
    time_ms: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

export const Submission = mongoose.model("Submission", submissionSchema);