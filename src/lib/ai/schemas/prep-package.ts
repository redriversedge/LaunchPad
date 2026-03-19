import { z } from "zod";

export const StarAnswerSchema = z.object({
  question: z.string(),
  situation: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
});

export const QuestionToAskSchema = z.object({
  question: z.string(),
  why: z.string(),
});

export const SalaryTalkingPointSchema = z.object({
  point: z.string(),
  context: z.string(),
});

export const RedFlagSchema = z.object({
  flag: z.string(),
  response: z.string(),
});

export const KeyThemeSchema = z.object({
  theme: z.string(),
  examples: z.string(),
});

export const PrepPackageSchema = z.object({
  starAnswers: z.array(StarAnswerSchema),
  questionsToAsk: z.array(QuestionToAskSchema),
  salaryTalking: z.array(SalaryTalkingPointSchema),
  redFlags: z.array(RedFlagSchema),
  keyThemes: z.array(KeyThemeSchema),
});

export type PrepPackage = z.infer<typeof PrepPackageSchema>;
export type StarAnswer = z.infer<typeof StarAnswerSchema>;

export const CompanyResearchSchema = z.object({
  overview: z.string(),
  missionAndValues: z.object({
    mission: z.string(),
    coreValues: z.array(z.string()),
    howTheyLiveIt: z.string(),
  }),
  culture: z.object({
    workStyle: z.string(),
    positives: z.array(z.string()),
    concerns: z.array(z.string()),
    glassdoorSentiment: z.string(),
  }),
  growth: z.object({
    trajectory: z.string(),
    recentMoves: z.array(z.string()),
    outlook: z.string(),
  }),
  interviewStyle: z.object({
    reputation: z.string(),
    commonFormats: z.array(z.string()),
    tipsFromReputation: z.string(),
  }),
  talkingPoints: z.array(z.string()),
});

export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;

export const MockInterviewResponseSchema = z.object({
  feedback: z.string(),
  nextQuestion: z.string().optional(),
  isComplete: z.boolean(),
  overallScore: z.number().min(1).max(100).nullable().optional(),
  overallFeedback: z.string().nullable().optional(),
});

export type MockInterviewResponse = z.infer<typeof MockInterviewResponseSchema>;
