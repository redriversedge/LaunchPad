import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/ai/client";
import {
  buildCoverLetterSystem,
  buildCoverLetterMessage,
} from "@/lib/ai/prompts/cover-letter";

interface CoverLetterResponse {
  coverLetter: string;
  keyPoints: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const application = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
    include: { job: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: {
      skills: true,
      workHistory: true,
      education: true,
      certifications: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Please complete your profile first" }, { status: 400 });
  }

  try {
    const result = await callClaudeJSON<CoverLetterResponse>({
      system: buildCoverLetterSystem(profile.targetIndustry ?? undefined),
      userMessage: buildCoverLetterMessage(
        {
          headline: profile.headline,
          summary: profile.summary,
          skills: profile.skills.map((s) => s.name),
          workHistory: profile.workHistory.map((w) => ({
            title: w.title,
            company: w.company,
            description: w.description,
            industry: w.industry,
            isCurrent: w.isCurrent,
          })),
          yearsExperience: profile.yearsExperience,
          currentLocation: profile.currentLocation,
          education: profile.education.map((e) => ({
            institution: e.institution,
            degree: e.degree,
            field: e.field,
          })),
          certifications: profile.certifications.map((c) => ({
            name: c.name,
            issuer: c.issuer,
          })),
        },
        {
          title: application.job.title,
          company: application.job.company,
          location: application.job.location,
          description: application.job.description,
          jobType: application.job.jobType,
          remoteType: application.job.remoteType,
        }
      ),
    });

    await prisma.application.update({
      where: { id },
      data: { coverLetter: result.coverLetter },
    });

    return NextResponse.json({
      coverLetter: result.coverLetter,
      keyPoints: result.keyPoints,
    });
  } catch (error) {
    console.error("Cover letter generation error:", error);
    return NextResponse.json({ error: "Failed to generate cover letter" }, { status: 500 });
  }
}
