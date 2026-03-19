import { z } from "zod";

export const ParsedSkillSchema = z.object({
  name: z.string(),
  category: z.enum(["technical", "soft", "industry", "tool"]).nullable(),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]).nullable(),
});

export const ParsedWorkHistorySchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  description: z.string().nullable(),
  bullets: z.array(z.string()),
  industry: z.string().nullable(),
});

export const ParsedEducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  gpa: z.number().nullable(),
});

export const ParsedCertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().nullable(),
  dateObtained: z.string().nullable(),
});

export const ParsedResumeSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  headline: z.string().nullable(),
  summary: z.string().nullable(),
  currentLocation: z.string().nullable(),
  yearsExperience: z.number().nullable(),
  skills: z.array(ParsedSkillSchema),
  workHistory: z.array(ParsedWorkHistorySchema),
  education: z.array(ParsedEducationSchema),
  certifications: z.array(ParsedCertificationSchema),
});

export type ParsedResume = z.infer<typeof ParsedResumeSchema>;
