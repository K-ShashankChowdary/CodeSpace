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
            default: "Pending"  // updated to AC/WA/TLE/MLE/CE/RE by the C++ worker
        },
        output: {
            type: String        // raw stdout/stderr or JSON array of test case results
        },
        timeTaken: {
            type: Number,
            default: 0          // execution time in milliseconds
        }
    },
    { timestamps: true }
);

export const Submission = mongoose.model("Submission", submissionSchema);