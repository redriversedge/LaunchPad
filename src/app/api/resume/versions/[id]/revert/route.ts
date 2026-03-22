import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ParsedResumeSchema } from "@/lib/ai/schemas/parsed-resume";
import { calculateProfileStrength } from "@/types";

/**
 * POST /api/resume/versions/[id]/revert
 * Revert to a previous resume version, making it the current base resume.
 * The current version becomes a previous version. Tailored resumes are preserved.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: targetId } = await params;

  try {
    // Find the target version
    const targetResume = await prisma.resume.findFirst({
      where: { id: targetId, userId: session.user.id, type: "original" },
    });

    if (!targetResume) {
      return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
    }

    if (targetResume.isCurrent) {
      return NextResponse.json({ error: "This is already the current resume" }, { status: 400 });
    }

    // Mark all originals as not current
    await prisma.resume.updateMany({
      where: { userId: session.user.id, type: "original" },
      data: { isCurrent: false },
    });

    // Mark the target as current
    await prisma.resume.update({
      where: { id: targetId },
      data: { isCurrent: true },
    });

    // Rebuild profile from the reverted resume's structured data
    if (targetResume.structuredData) {
      let parsed;
      try {
        parsed = ParsedResumeSchema.parse(JSON.parse(targetResume.structuredData));
      } catch {
        // If parsing fails, skip profile rebuild
        return NextResponse.json({
          message: `Reverted to ${targetResume.originalFileName || `v${targetResume.version}`}. Profile was not updated (parse error).`,
          resume: {
            id: targetResume.id,
            name: targetResume.name,
            version: targetResume.version,
            originalFileName: targetResume.originalFileName,
          },
        });
      }

      const profile = await prisma.profile.upsert({
        where: { userId: session.user.id },
        update: {
          headline: parsed.headline,
          summary: parsed.summary,
          currentLocation: parsed.currentLocation,
          yearsExperience: parsed.yearsExperience,
        },
        create: {
          userId: session.user.id,
          headline: parsed.headline,
          summary: parsed.summary,
          currentLocation: parsed.currentLocation,
          yearsExperience: parsed.yearsExperience,
        },
      });

      // Rebuild skills
      if (parsed.skills.length > 0) {
        await prisma.skill.deleteMany({ where: { profileId: profile.id } });
        await prisma.skill.createMany({
          data: parsed.skills.map((s) => ({
            profileId: profile.id,
            name: s.name,
            category: s.category,
            level: s.level,
          })),
        });
      }

      // Rebuild work history
      if (parsed.workHistory.length > 0) {
        await prisma.workHistory.deleteMany({ where: { profileId: profile.id } });
        await prisma.workHistory.createMany({
          data: parsed.workHistory.map((w) => {
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
    }

    return NextResponse.json({
      message: `Reverted to ${targetResume.originalFileName || `v${targetResume.version}`}. Profile updated.`,
      resume: {
        id: targetResume.id,
        name: targetResume.name,
        version: targetResume.version,
        originalFileName: targetResume.originalFileName,
      },
    });
  } catch (error) {
    console.error("Error reverting resume:", error);
    return NextResponse.json({ error: "Failed to revert resume" }, { status: 500 });
  }
}
