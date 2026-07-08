import { z } from "zod";

export const createSessionSchema = z.object({
  problemIds: z.array(z.string()).min(1, "At least one problem ID must be selected"),
});

export const guestJoinSchema = z.object({
  name: z.string().min(1, "Name is required to join the session").trim(),
  sessionCode: z.string().length(6, "Session code must be exactly 6 characters").trim(),
});
