import { z } from "zod";

export const JobScoreBreakdownSchema = z.object({
  score: z.number().min(0).max(100),
  details: z.string(),
});

export const JobScoreSchema = z.object({
  fitScore: z.number().min(0).max(100),
  hireProbability: z.number().min(0).max(100),
  breakdown: z.object({
    skillMatch: JobScoreBreakdownSchema,
    experienceMatch: JobScoreBreakdownSchema,
    locationMatch: JobScoreBreakdownSchema,
    salaryMatch: JobScoreBreakdownSchema,
  }),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  recommendation: z.string(),
});

export type JobScore = z.infer<typeof JobScoreSchema>;
