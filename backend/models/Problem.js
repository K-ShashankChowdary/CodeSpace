import mongoose from "mongoose";

const problemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    testCases: [
        {
            input: { type: String, required: true },
            output: { type: String, required: true }
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

export const Problem = mongoose.model("Problem", problemSchema);