//import the dotenv config directly so it executes during the import phase, before anything else is evaluated
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// configure CORS with the now-guaranteed environment variable
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

// configure middlewares for parsing JSON and URL-encoded data
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// import all my modular route files
import userRouter from "./routes/user.routes.js";
import submissionRouter from "./routes/submission.routes.js";
import problemRouter from "./routes/problem.routes.js";

// I mount the routers to their specific API version paths
app.use("/api/v1/users", userRouter);
app.use("/api/v1/submissions", submissionRouter);
app.use("/api/v1/problems", problemRouter);

export { app };