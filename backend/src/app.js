import express from 'express';
import cors from 'cors';
import submissionRoutes from './routes/submission.routes.js'; 

const app = express();

// I strictly define the frontend origin to bypass the browser's CORS block
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

// I configure middlewares for parsing data
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// I mount the submission routes
app.use('/api/v1/submissions', submissionRoutes);

// I use a global error handler to catch async errors cleanly
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

export { app };