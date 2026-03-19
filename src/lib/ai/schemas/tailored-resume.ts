import { z } from "zod";

export const TailoredWorkHistorySchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  bullets: z.array(z.string()),
  industry: z.string().nullable(),
});

export const TailoredChangeSchema = z.object({
  section: z.string(),
  original: z.string(),
  modified: z.string(),
  reason: z.string(),
});

export const TailoredResumeSchema = z.object({
  sections: z.object({
    summary: z.string(),
    skills: z.array(z.string()),
    workHistory: z.array(TailoredWorkHistorySchema),
  }),
  changes: z.array(TailoredChangeSchema),
});

export type TailoredResume = z.infer<typeof TailoredResumeSchema>;
