import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/ai/client";
import { buildJobScorerSystem, buildJobScorerMessage } from "@/lib/ai/prompts/job-scorer";
import { JobScoreSchema, type JobScore } from "@/lib/ai/schemas/job-score";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  const job = await prisma.jobListing.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { skills: true, workHistory: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Please complete your profile first" }, { status: 400 });
  }

  // Check if we already have a score for this user+job
  const existingSaved = await prisma.savedJob.findUnique({
    where: { userId_jobId: { userId: session.user.id, jobId } },
  });

  if (existingSaved?.scoreBreakdown) {
    return NextResponse.json({
      score: JSON.parse(existingSaved.scoreBreakdown),
      cached: true,
    });
  }

  try {
    const score = await callClaudeJSON<JobScore>({
      system: buildJobScorerSystem(profile.targetIndustry ?? undefined),
      userMessage: buildJobScorerMessage(
        {
          headline: profile.headline,
          skills: profile.skills.map((s) => s.name),
          workHistory: profile.workHistory.map((w) => ({
            title: w.title,
            company: w.company,
            industry: w.industry,
          })),
          yearsExperience: profile.yearsExperience,
          currentLocation: profile.currentLocation,
          salaryMin: profile.salaryMin,
          salaryMax: profile.salaryMax,
          remotePreference: profile.remotePreference,
        },
        {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          jobType: job.jobType,
          remoteType: job.remoteType,
        }
      ),
    });

    const validated = JobScoreSchema.parse(score);

    // Save score to saved job record if it exists
    if (existingSaved) {
      await prisma.savedJob.update({
        where: { id: existingSaved.id },
        data: {
          fitScore: validated.fitScore,
          hireProbability: validated.hireProbability,
          scoreBreakdown: JSON.stringify(validated),
        },
      });
    }

    return NextResponse.json({ score: validated, cached: false });
  } catch (error) {
    console.error("Job scoring error:", error);
    return NextResponse.json({ error: "Failed to score job" }, { status: 500 });
  }
}
