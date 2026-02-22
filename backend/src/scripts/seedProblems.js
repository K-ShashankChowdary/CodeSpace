import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Problem } from "../models/problem.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly point to the backend root .env file
const envPath = path.resolve(__dirname, "../../.env");
if (!fs.existsSync(envPath)) {
    console.error(`Env file not found at: ${envPath}`);
    process.exit(1);
}

dotenv.config({ path: envPath });

const problems = [
    {
        title: "Sum of Array",
        description: "Given an integer N, followed by N space-separated integers, calculate and print the sum of the array.\n\nInput Format:\nThe first line contains an integer N.\nThe second line contains N space-separated integers.\n\nOutput Format:\nPrint a single integer representing the sum.",
        difficulty: "Easy",
        timeLimit: 1000,
        memoryLimit: 256,
        testCases: [
            { input: "5\n1 2 3 4 5", output: "15", isHidden: false },
            { input: "3\n10 20 30", output: "60", isHidden: false },
            { input: "1\n-5", output: "-5", isHidden: true },
            { input: "4\n0 0 0 0", output: "0", isHidden: true }
        ]
    },
    {
        title: "Even or Odd",
        description: "Given a single integer N. Print 'Even' if the number is even, otherwise print 'Odd'.\n\nInput Format:\nA single integer N.\n\nOutput Format:\nString 'Even' or 'Odd'.",
        difficulty: "Easy",
        timeLimit: 500,
        memoryLimit: 128,
        testCases: [
            { input: "4", output: "Even", isHidden: false },
            { input: "7", output: "Odd", isHidden: false },
            { input: "0", output: "Even", isHidden: true },
            { input: "-3", output: "Odd", isHidden: true }
        ]
    }
];

const seedDatabase = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from .env");
        }

        await mongoose.connect(`${process.env.MONGODB_URI}/codespace`);
        console.log("Connected to MongoDB");

        await Problem.deleteMany({});
        console.log("Cleared existing problems.");

        await Problem.insertMany(problems);
        console.log("Successfully inserted new problems.");

        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase();