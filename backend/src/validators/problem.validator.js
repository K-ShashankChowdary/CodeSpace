import { z } from "zod";

export const createProblemSchema = z.object({
  title: z.string().min(1, "Title is required").trim(),
  description: z.string().min(1, "Description is required"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  tags: z.array(z.string()).default([]),
  testcases: z.array(
    z.object({
      input: z.string(),
      expectedOutput: z.string(),
      isHidden: z.boolean().default(false),
    })
  ).min(1, "At least one testcase is required"),
  timeLimit: z.number().default(2000),
  memoryLimit: z.number().default(256000),
});
