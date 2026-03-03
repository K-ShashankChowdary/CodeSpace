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
        timeLimit: {
            type: Number,
            default: 2000,      // max execution time in milliseconds
        },
        memoryLimit: {
            type: Number,
            default: 256,       // max memory in MB for the Docker container
        },
        testCases: [
            {
                input: { type: String, required: true },
                output: { type: String, required: true },
                isHidden: {
                    type: Boolean,
                    default: false  // hidden test cases only run during "submit", never shown to users
                }
            },
        ],
    },
    { timestamps: true }
);

export const Problem = mongoose.model("Problem", problemSchema);