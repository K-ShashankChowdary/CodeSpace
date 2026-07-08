import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").trim(),
  username: z.string().min(3, "Username must be at least 3 characters").trim(),
  email: z.string().email("Invalid email address").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(1, "Password is required"),
}).refine(data => data.username || data.email, {
  message: "Either username or email is required",
});
