// load env variables before any other module reads them
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// allow the React frontend to make cross-origin API requests with cookies
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// route modules
import userRouter from "./routes/user.routes.js";
import submissionRouter from "./routes/submission.routes.js";
import problemRouter from "./routes/problem.routes.js";
import roomRouter from "./routes/room.routes.js";

// mount routes under versioned API paths
app.use("/api/v1/users", userRouter);
app.use("/api/v1/submissions", submissionRouter);
app.use("/api/v1/problems", problemRouter);
app.use("/api/v1/rooms", roomRouter);

// global error handler - catches all errors thrown by controllers via asyncHandler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors: err.errors || [],
    });
});

export { app };