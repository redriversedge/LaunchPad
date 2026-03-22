import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/ai/client";
import { buildResumeTailorSystem, buildResumeTailorMessage } from "@/lib/ai/prompts/resume-tailor";
import { TailoredResumeSchema, type TailoredResume } from "@/lib/ai/schemas/tailored-resume";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: applicationId } = await params;

  // Find the application with its job listing
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
    include: { job: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Get user profile for industry context
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { skills: true, workHistory: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Please complete your profile first" }, { status: 400 });
  }

  // Get the user's current base resume
  const originalResume = await prisma.resume.findFirst({
    where: { userId: session.user.id, type: "original", isCurrent: true },
    orderBy: { createdAt: "desc" },
  });

  if (!originalResume?.structuredData) {
    return NextResponse.json({ error: "No parsed resume found. Upload a resume first." }, { status: 400 });
  }

  let parsedResume;
  try {
    parsedResume = JSON.parse(originalResume.structuredData);
  } catch {
    return NextResponse.json({ error: "Failed to parse stored resume data" }, { status: 500 });
  }

  // Build resume data from the parsed resume
  const resumeData = {
    summary: parsedResume.summary ?? profile.summary,
    skills: parsedResume.skills?.map((s: { name: string }) => s.name) ?? profile.skills.map((s) => s.name),
    workHistory: (parsedResume.workHistory ?? []).map(
      (w: { company: string; title: string; location?: string; startDate: string; endDate?: string; isCurrent: boolean; bullets?: string[]; industry?: string }) => ({
        company: w.company,
        title: w.title,
        location: w.location ?? null,
        startDate: w.startDate,
        endDate: w.endDate ?? null,
        isCurrent: w.isCurrent,
        bullets: w.bullets ?? [],
        industry: w.industry ?? null,
      })
    ),
  };

  const jobData = {
    title: application.job.title,
    company: application.job.company,
    location: application.job.location,
    description: application.job.description,
    jobType: application.job.jobType,
    remoteType: application.job.remoteType,
  };

  try {
    const tailored = await callClaudeJSON<TailoredResume>({
      system: buildResumeTailorSystem(profile.targetIndustry ?? undefined),
      userMessage: buildResumeTailorMessage(resumeData, jobData),
      maxTokens: 8192,
    });

    const validated = TailoredResumeSchema.parse(tailored);

    // Save as a new tailored resume record
    const tailoredResume = await prisma.resume.create({
      data: {
        userId: session.user.id,
        name: `Tailored for ${application.job.title} at ${application.job.company}`,
        type: "tailored",
        tailoredContent: JSON.stringify(validated.sections),
        changeLog: JSON.stringify(validated.changes),
        applicationId: applicationId,
        structuredData: originalResume.structuredData,
      },
    });

    return NextResponse.json({
      id: tailoredResume.id,
      sections: validated.sections,
      changes: validated.changes,
    });
  } catch (error) {
    console.error("Resume tailoring error:", error);
    return NextResponse.json({ error: "Failed to tailor resume" }, { status: 500 });
  }
}
