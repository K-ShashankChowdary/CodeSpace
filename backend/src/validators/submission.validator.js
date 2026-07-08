import { z } from "zod";

export const runSubmitSchema = z.object({
  problemId: z.string().min(1, "Problem ID is required"),
  language: z.enum(["cpp", "c", "python", "java", "javascript"]),
  code: z.string().min(1, "Code cannot be empty"),
  testcaseIndex: z.number().optional(), // Used in "run" to test a specific case
  sessionId: z.string().optional(),     // Used in "submit" for analytics
  executionType: z.enum(["run", "submit"]).optional(), // Legacy support
});
