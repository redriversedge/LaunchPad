import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/ai/client";
import { buildResumeTailorSystem, buildResumeTailorMessage } from "@/lib/ai/prompts/resume-tailor";
import { TailoredResumeSchema, type TailoredResume } from "@/lib/ai/schemas/tailored-resume";
import { editDocxBuffer, type TextReplacement } from "@/lib/resume/docx";

/**
 * POST /api/applications/[id]/tailor-docx
 *
 * Generates a format-preserving tailored resume:
 * 1. Gets the original .docx file from the database
 * 2. Runs AI to determine what text changes to make
 * 3. Applies changes surgically at the XML run level
 * 4. Returns the modified .docx as a download
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: applicationId } = await params;

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
    include: { job: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { skills: true, workHistory: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Please complete your profile first" }, { status: 400 });
  }

  // Get the user's current base resume with file data
  const originalResume = await prisma.resume.findFirst({
    where: { userId: session.user.id, type: "original", isCurrent: true },
    orderBy: { createdAt: "desc" },
  });

  if (!originalResume?.structuredData) {
    return NextResponse.json({ error: "No parsed resume found. Upload a resume first." }, { status: 400 });
  }

  // Check if we have a .docx to work with (either original .docx or converted from PDF)
  const hasOriginalDocx = originalResume.fileData && originalResume.fileType === "docx";
  const hasConvertedDocx = originalResume.convertedDocxData && originalResume.fileType === "pdf";
  const hasOriginalFile = hasOriginalDocx || hasConvertedDocx;

  let parsedResume;
  try {
    parsedResume = JSON.parse(originalResume.structuredData);
  } catch {
    return NextResponse.json({ error: "Failed to parse stored resume data" }, { status: 500 });
  }

  // Build resume data for AI
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
    // Step 1: Get AI to determine what text changes to make
    const tailored = await callClaudeJSON<TailoredResume>({
      system: buildResumeTailorSystem(profile.targetIndustry ?? undefined),
      userMessage: buildResumeTailorMessage(resumeData, jobData),
      maxTokens: 8192,
    });

    const validated = TailoredResumeSchema.parse(tailored);

    // Save the tailored content to database (for the UI editor)
    await prisma.resume.create({
      data: {
        userId: session.user.id,
        name: `Tailored for ${application.job.title} at ${application.job.company}`,
        type: "tailored",
        tailoredContent: JSON.stringify(validated.sections),
        changeLog: JSON.stringify(validated.changes),
        applicationId,
        structuredData: originalResume.structuredData,
      },
    });

    // Step 2: If we have the original .docx, apply changes surgically
    if (hasOriginalFile) {
      // Use original .docx if available, otherwise use the converted .docx from PDF
      const docxBase64 = hasOriginalDocx
        ? originalResume.fileData!
        : originalResume.convertedDocxData!;
      const originalBuffer = Buffer.from(docxBase64, "base64");

      // Convert AI changes to TextReplacement format
      const replacements: TextReplacement[] = validated.changes.map((change) => ({
        original: change.original,
        replacement: change.modified,
        reason: change.reason,
        section: change.section,
      }));

      const { editedBuffer, results, qualityCheck, skippedEdits } = await editDocxBuffer(
        originalBuffer,
        replacements
      );

      const appliedCount = results.filter((r) => r.applied).length;

      return NextResponse.json({
        sections: validated.sections,
        changes: validated.changes,
        hasDocx: true,
        docxBase64: editedBuffer.toString("base64"),
        editStats: {
          totalChanges: replacements.length,
          applied: appliedCount,
          skipped: skippedEdits.length,
          skippedEdits,
          qualityCheck,
        },
      });
    }

    // No original .docx file - return text-only tailoring
    return NextResponse.json({
      sections: validated.sections,
      changes: validated.changes,
      hasDocx: false,
      editStats: null,
    });
  } catch (error) {
    console.error("Resume tailoring error:", error);
    return NextResponse.json({ error: "Failed to tailor resume" }, { status: 500 });
  }
}
