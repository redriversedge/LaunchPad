import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/resume/parser";
import { callClaudeJSON } from "@/lib/ai/client";
import { RESUME_PARSER_SYSTEM, buildResumeParserMessage } from "@/lib/ai/prompts/resume-parser";
import { ParsedResumeSchema, type ParsedResume } from "@/lib/ai/schemas/parsed-resume";
import { calculateProfileStrength } from "@/types";
import { convertPdfToDocx } from "@/lib/resume/pdf-to-docx";

const MAX_VERSIONS = 3;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
    }

    // Validate file type
    const ext = file.name.toLowerCase().split(".").pop() || "";
    if (ext !== "pdf" && ext !== "docx" && ext !== "doc") {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a .docx or .pdf file." },
        { status: 400 }
      );
    }

    const fileType = ext === "pdf" ? "pdf" : "docx";

    // Extract text from file
    const buffer = Buffer.from(await file.arrayBuffer());

    // Basic corruption check
    if (fileType === "pdf") {
      const header = buffer.subarray(0, 5).toString("ascii");
      if (!header.startsWith("%PDF")) {
        return NextResponse.json(
          { error: "This file appears to be corrupted. It does not have a valid PDF header." },
          { status: 400 }
        );
      }
    } else {
      // DOCX files start with PK (ZIP format)
      const header = buffer.subarray(0, 2).toString("ascii");
      if (header !== "PK") {
        return NextResponse.json(
          { error: "This file appears to be corrupted. It does not have a valid DOCX header." },
          { status: 400 }
        );
      }
    }

    const rawText = await extractTextFromFile(buffer, file.name);

    // Parse with AI
    const parsed = await callClaudeJSON<ParsedResume>({
      system: RESUME_PARSER_SYSTEM,
      userMessage: buildResumeParserMessage(rawText),
    });

    // Validate with Zod
    const validated = ParsedResumeSchema.parse(parsed);

    // Handle PDF-to-DOCX conversion
    let convertedDocxData: string | null = null;
    let conversionConfidence: string | null = null;
    let conversionIssues: string | null = null;

    if (fileType === "pdf") {
      const conversionResult = await convertPdfToDocx(rawText, {
        name: validated.name,
        headline: validated.headline,
        summary: validated.summary,
        currentLocation: validated.currentLocation,
        email: validated.email,
        phone: validated.phone,
        skills: validated.skills,
        workHistory: validated.workHistory,
        education: validated.education,
        certifications: validated.certifications,
      });

      convertedDocxData = conversionResult.docxBuffer.toString("base64");
      conversionConfidence = conversionResult.confidence;
      conversionIssues = conversionResult.issues.length > 0
        ? JSON.stringify(conversionResult.issues)
        : null;
    }

    // Determine the next version number
    const existingResumes = await prisma.resume.findMany({
      where: { userId: session.user.id, type: "original" },
      orderBy: { version: "desc" },
      select: { id: true, version: true, isCurrent: true },
    });

    const nextVersion = existingResumes.length > 0
      ? existingResumes[0].version + 1
      : 1;

    // Mark all existing originals as not current
    if (existingResumes.length > 0) {
      await prisma.resume.updateMany({
        where: { userId: session.user.id, type: "original", isCurrent: true },
        data: { isCurrent: false },
      });
    }

    // Save new resume record
    const resume = await prisma.resume.create({
      data: {
        userId: session.user.id,
        name: `Resume v${nextVersion}`,
        type: "original",
        originalFileName: file.name,
        fileData: buffer.toString("base64"),
        fileType,
        convertedDocxData,
        conversionConfidence,
        conversionIssues,
        version: nextVersion,
        isCurrent: true,
        parsedContent: rawText,
        structuredData: JSON.stringify(validated),
      },
    });

    // Enforce version limit: keep only MAX_VERSIONS previous versions
    const oldVersions = await prisma.resume.findMany({
      where: {
        userId: session.user.id,
        type: "original",
        isCurrent: false,
      },
      orderBy: { version: "desc" },
      select: { id: true, version: true },
    });

    if (oldVersions.length > MAX_VERSIONS) {
      const toDelete = oldVersions.slice(MAX_VERSIONS);
      await prisma.resume.deleteMany({
        where: { id: { in: toDelete.map((v) => v.id) } },
      });
    }

    // Upsert profile with parsed data
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        headline: validated.headline,
        summary: validated.summary,
        currentLocation: validated.currentLocation,
        yearsExperience: validated.yearsExperience,
      },
      create: {
        userId: session.user.id,
        headline: validated.headline,
        summary: validated.summary,
        currentLocation: validated.currentLocation,
        yearsExperience: validated.yearsExperience,
      },
    });

    // Create skills
    if (validated.skills.length > 0) {
      await prisma.skill.deleteMany({ where: { profileId: profile.id } });
      await prisma.skill.createMany({
        data: validated.skills.map((s) => ({
          profileId: profile.id,
          name: s.name,
          category: s.category,
          level: s.level,
        })),
      });
    }

    // Create work history
    if (validated.workHistory.length > 0) {
      await prisma.workHistory.deleteMany({ where: { profileId: profile.id } });
      await prisma.workHistory.createMany({
        data: validated.workHistory.map((w) => {
          const start = new Date(w.startDate);
          const end = w.endDate ? new Date(w.endDate) : null;
          return {
            profileId: profile.id,
            company: w.company,
            title: w.title,
            location: w.location,
            startDate: isNaN(start.getTime()) ? new Date() : start,
            endDate: end && !isNaN(end.getTime()) ? end : null,
            isCurrent: w.isCurrent,
            description: w.description,
            bullets: JSON.stringify(w.bullets),
            industry: w.industry,
          };
        }),
      });
    }

    // Create education
    if (validated.education.length > 0) {
      await prisma.education.deleteMany({ where: { profileId: profile.id } });
      await prisma.education.createMany({
        data: validated.education.map((e) => ({
          profileId: profile.id,
          institution: e.institution,
          degree: e.degree,
          field: e.field,
          startDate: e.startDate ? new Date(e.startDate) : null,
          endDate: e.endDate ? new Date(e.endDate) : null,
          gpa: e.gpa,
        })),
      });
    }

    // Create certifications
    if (validated.certifications.length > 0) {
      await prisma.certification.deleteMany({ where: { profileId: profile.id } });
      await prisma.certification.createMany({
        data: validated.certifications.map((c) => ({
          profileId: profile.id,
          name: c.name,
          issuer: c.issuer,
          dateObtained: c.dateObtained ? new Date(c.dateObtained) : null,
        })),
      });
    }

    // Recalculate profile strength
    const updatedProfile = await prisma.profile.findUnique({
      where: { id: profile.id },
      include: { skills: true, workHistory: true, education: true },
    });

    if (updatedProfile) {
      const strength = calculateProfileStrength(updatedProfile);
      await prisma.profile.update({
        where: { id: profile.id },
        data: { profileStrength: strength },
      });
    }

    // Count preserved tailored versions
    const tailoredCount = await prisma.resume.count({
      where: { userId: session.user.id, type: "tailored" },
    });

    return NextResponse.json({
      resume: {
        id: resume.id,
        name: resume.name,
        version: resume.version,
        fileType: resume.fileType,
        originalFileName: resume.originalFileName,
        conversionConfidence: resume.conversionConfidence,
        conversionIssues: resume.conversionIssues
          ? JSON.parse(resume.conversionIssues)
          : [],
      },
      parsed: validated,
      previousVersions: oldVersions.length,
      tailoredVersionsPreserved: tailoredCount,
      message: existingResumes.length > 0
        ? `Resume replaced successfully (v${nextVersion}). ${tailoredCount} tailored version(s) preserved.`
        : "Resume parsed successfully",
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to process resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
