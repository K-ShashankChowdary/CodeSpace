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
            default: 2000, // Default execution time limit in milliseconds
        },
        memoryLimit: {
            type: Number,
            default: 256, // Default memory limit in megabytes
        },
        testCases: [
            {
                input: { 
                    type: String, 
                    required: true 
                },
                output: { 
                    type: String, 
                    required: true 
                },
                isHidden: {
                    type: Boolean,
                    default: false // Determines if the test case is hidden during initial run
                }
            },
        ],
    },
    { timestamps: true } 
);

export const Problem = mongoose.model("Problem", problemSchema);