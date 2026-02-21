import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import submissionRoutes from "./routes/submission.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

//strictly define the frontend origin to bypass the browser's CORS block and allow credentials for cookies
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// configure middlewares for parsing JSON and URL-encoded data
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// add the cookie parser middleware to extract JWTs from incoming request cookies securely
app.use(cookieParser());

// mount the user authentication routes
app.use("/api/v1/users", userRoutes);

// mount the code submission routes
app.use("/api/v1/submissions", submissionRoutes);

// use a global error handler to catch async errors cleanly and return a structured JSON response
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ success: false, message: err.message || "Internal Server Error" });
});

export { app };
