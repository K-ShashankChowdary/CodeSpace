import express from "express";
import cors from "cors";
import { ApiError } from "./utils/ApiError.js"; // <--- ADD THIS LINE

const app = express();

// Middleware Configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

// --- ROUTES ---
import submissionRouter from "./routes/submission.routes.js";
// import problemRouter from "./routes/problem.routes.js"; // Uncomment if you added this

// Mount routes
app.use("/api/v1/submissions", submissionRouter);
// app.use("/api/v1/problems", problemRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    // Now this line works because ApiError is imported!
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors
        });
    }
    // Fallback for unexpected errors
    return res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
});

export { app };