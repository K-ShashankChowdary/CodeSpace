import express from "express";
import cors from "cors";

const app = express();

// Middleware Configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN, // Security: Allow only trusted domains
    credentials: true
}));

app.use(express.json({ limit: "16kb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // Parse URL-encoded data
app.use(express.static("public")); // Serve static files if needed

// --- ROUTES ---
import submissionRouter from "./routes/submission.routes.js";

// Mount routes on versioned path
app.use("/api/v1/submissions", submissionRouter);

export { app };