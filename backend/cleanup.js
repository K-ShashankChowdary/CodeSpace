import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Submission } from "./src/models/submission.model.js";
import { Problem } from "./src/models/problem.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "./.env") });

const cleanDatabase = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(`${process.env.MONGODB_URI}/codespace`);
        
        // Delete all submissions
        const submissionResult = await Submission.deleteMany({});
        console.log(`🗑️  Deleted ${submissionResult.deletedCount} submissions.`);

        // Delete all problems (if you want to start fresh with seeding)
        const problemResult = await Problem.deleteMany({});
        console.log(`🗑️  Deleted ${problemResult.deletedCount} problems.`);

        console.log("\n✅ Database is clean!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
        process.exit(1);
    }
};

cleanDatabase();