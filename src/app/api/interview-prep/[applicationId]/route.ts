import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/ai/client";
import {
  buildInterviewPrepSystem,
  buildInterviewPrepMessage,
} from "@/lib/ai/prompts/interview-prep";
import {
  buildCompanyResearchSystem,
  buildCompanyResearchMessage,
} from "@/lib/ai/prompts/company-research";
import {
  PrepPackageSchema,
  CompanyResearchSchema,
  type PrepPackage,
  type CompanyResearch,
} from "@/lib/ai/schemas/prep-package";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await params;

  const prep = await prisma.interviewPrep.findFirst({
    where: {
      applicationId,
      userId: session.user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!prep) {
    return NextResponse.json({ prep: null });
  }

  return NextResponse.json({
    prep: {
      id: prep.id,
      companyResearch: prep.companyResearch
        ? JSON.parse(prep.companyResearch)
        : null,
      prepPackage: prep.prepPackage ? JSON.parse(prep.prepPackage) : null,
      createdAt: prep.createdAt,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await params;

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      userId: session.user.id,
    },
    include: {
      job: true,
    },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 }
    );
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: {
      skills: true,
      workHistory: { orderBy: { startDate: "desc" } },
      education: true,
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Please complete your profile first" },
      { status: 400 }
    );
  }

  const job = application.job;

  try {
    // Step 1: Generate company research
    const companyResearchRaw = await callClaudeJSON<CompanyResearch>({
      system: buildCompanyResearchSystem(),
      userMessage: buildCompanyResearchMessage(job.company, job.title),
      maxTokens: 4096,
    });

    const companyResearch = CompanyResearchSchema.parse(companyResearchRaw);

    // Step 2: Generate prep package with company context
    const profileData = {
      headline: profile.headline,
      summary: profile.summary,
      skills: profile.skills.map((s) => s.name),
      workHistory: profile.workHistory.map((w) => ({
        title: w.title,
        company: w.company,
        description: w.description,
        bullets: w.bullets,
        industry: w.industry,
        startDate: w.startDate.toISOString().split("T")[0],
        endDate: w.endDate ? w.endDate.toISOString().split("T")[0] : null,
        isCurrent: w.isCurrent,
      })),
      education: profile.education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
      })),
      yearsExperience: profile.yearsExperience,
      currentLocation: profile.currentLocation,
      salaryMin: profile.salaryMin,
      salaryMax: profile.salaryMax,
    };

    const jobData = {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      jobType: job.jobType,
      remoteType: job.remoteType,
    };

    const prepPackageRaw = await callClaudeJSON<PrepPackage>({
      system: buildInterviewPrepSystem(profile.targetIndustry ?? undefined),
      userMessage: buildInterviewPrepMessage(
        profileData,
        jobData,
        JSON.stringify(companyResearch, null, 2)
      ),
      maxTokens: 8192,
    });

    const prepPackage = PrepPackageSchema.parse(prepPackageRaw);

    // Save to database
    const prep = await prisma.interviewPrep.create({
      data: {
        userId: session.user.id,
        applicationId,
        companyResearch: JSON.stringify(companyResearch),
        prepPackage: JSON.stringify(prepPackage),
      },
    });

    return NextResponse.json({
      prep: {
        id: prep.id,
        companyResearch,
        prepPackage,
        createdAt: prep.createdAt,
      },
    });
  } catch (error) {
    console.error("Interview prep generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate interview prep package" },
      { status: 500 }
    );
  }
}
