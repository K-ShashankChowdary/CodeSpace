import mongoose, { Schema } from "mongoose";

const problemSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        difficulty: {
            type: String,
            enum: ["Easy", "Medium", "Hard"],
            required: true,
        },
        testCases: [
            {
                input: { type: String, required: true },
                output: { type: String, required: true },
            },
        ],
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt
);

export const Problem = mongoose.model("Problem", problemSchema);