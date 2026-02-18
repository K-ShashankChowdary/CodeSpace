// backend/seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Problem } from "./src/models/problem.model.js";

dotenv.config();

const seed = async () => {
    await mongoose.connect(`${process.env.MONGODB_URI}/codespace`);
    
    // Create a standard "A + B" problem
    const problem = await Problem.create({
        title: "Sum of Two Numbers",
        description: "Read two integers and print their sum.",
        difficulty: "Easy",
        testCases: [
            { input: "3 4", output: "7" } // 3 + 4 = 7
        ]
    });

    console.log("✅ Problem Created!");
    console.log("👉 USE THIS ID IN YOUR TEST SCRIPT:", problem._id.toString());
    process.exit();
};

seed();