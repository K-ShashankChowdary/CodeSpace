import { Problem } from "../models/problem.model.js";

const getAllProblems = async (req, res) => {
    try {
        const problems = await Problem.find({}).select("-description -testCases").lean();
        return res.status(200).json({
            success: true,
            data: problems,
            message: "Problems retrieved successfully",
        });
    } catch (error) {
        console.error("Crash in getAllProblems:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || "Internal Server Error" 
        });
    }
};

const getProblemById = async (req, res) => {
    try {
        const { id } = req.params;
        const problem = await Problem.findById(id).lean();

        if (!problem) {
            return res.status(404).json({ success: false, message: "Problem not found" });
        }

        problem.testCases = problem.testCases.filter(tc => !tc.isHidden);

        return res.status(200).json({
            success: true,
            data: problem,
            message: "Problem retrieved successfully",
        });
    } catch (error) {
        console.error("Crash in getProblemById:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || "Internal Server Error" 
        });
    }
};

export { getAllProblems, getProblemById };