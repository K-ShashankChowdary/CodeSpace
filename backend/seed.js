import mongoose from "mongoose";
import { Problem } from "./src/models/problem.model.js"; // Adjust path if needed
import dotenv from "dotenv";
dotenv.config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI + "/codespace");
        console.log("🔌 Connected to DB");

        // --- THE FIX: DROP THE COLLECTION ---
        // This deletes the 'problems' collection AND its indexes (fixing the slug error)
        try {
            await mongoose.connection.collection("problems").drop();
            console.log("🧹 Old data and indexes cleared!");
        } catch (error) {
            // If collection doesn't exist, ignore the error
            if (error.code === 26) {
                console.log("🧹 Collection was already empty.");
            } else {
                throw error;
            }
        }

        // --- CREATE NEW PROBLEM ---
        const problem = await Problem.create({
            title: "Two Sum",
            description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
            difficulty: "Easy",
            testCases: [
                { 
                    input: "2\n7\n11\n15\n9", // Standard input format for cin >>
                    output: "0 1" 
                } 
            ]
        });

        console.log("✅ Problem Created!");
        console.log("👉 PROBLEM ID:", problem._id.toString());
        process.exit();
        
    } catch (err) {
        console.error("❌ Seed Failed:", err);
        process.exit(1);
    }
};

seed();