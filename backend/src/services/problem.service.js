import { Problem } from "../models/problem.model.js";
import { ApiError } from "../utils/ApiError.js";
import axios from "axios";

class ProblemService {
  async getAllProblems() {
    return await Problem.find()
      .select("title difficulty tags isCustom")
      .sort({ createdAt: -1 });
  }

  async getProblemById(problemId) {
    const problem = await Problem.findById(problemId);
    if (!problem) throw new ApiError(404, "Problem not found");
    return problem;
  }

  async createCustomProblem(problemData) {
    const { title, description, difficulty, tags, testcases, timeLimit, memoryLimit } = problemData;
    return await Problem.create({
      title,
      description,
      difficulty,
      tags: tags || [],
      testcases,
      isCustom: true,
      timeLimit: timeLimit || 2000,
      memoryLimit: memoryLimit || 256000,
    });
  }

  async deleteCustomProblem(problemId) {
    const problem = await Problem.findOne({ _id: problemId, isCustom: true });
    if (!problem) throw new ApiError(404, "Custom problem not found or cannot be deleted");
    
    await problem.deleteOne();
  }

  async importFromLeetCode(url) {
    // Basic extraction
    const match = url.match(/problems\/([^/]+)/);
    if (!match) throw new ApiError(400, "Invalid LeetCode URL");
    
    const titleSlug = match[1];
    
    // GraphQL query to LeetCode
    const query = `
      query getQuestionDetail($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          title
          content
          difficulty
          topicTags { name }
          exampleTestcases
        }
      }
    `;

    const response = await axios.post("https://leetcode.com/graphql", {
      query,
      variables: { titleSlug }
    });

    const q = response.data?.data?.question;
    if (!q) throw new ApiError(404, "Problem not found on LeetCode");

    const newProblem = await Problem.create({
      title: q.title,
      description: q.content || "Imported from LeetCode",
      difficulty: q.difficulty,
      tags: q.topicTags.map(t => t.name),
      isCustom: true,
      testcases: [{ input: q.exampleTestcases || "", expectedOutput: "TBD", isHidden: false }]
    });

    return newProblem;
  }
}

export const problemService = new ProblemService();
