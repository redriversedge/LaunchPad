import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/resume/all
 * Returns all resumes (base + tailored) with job context for tailored ones.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const resumes = await prisma.resume.findMany({
      where: { userId: session.user.id },
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        type: true,
        originalFileName: true,
        fileType: true,
        version: true,
        isCurrent: true,
        conversionConfidence: true,
        conversionIssues: true,
        applicationId: true,
        createdAt: true,
      },
    });

    // For tailored resumes, look up the associated job info
    const applicationIds = resumes
      .filter((r) => r.type === "tailored" && r.applicationId)
      .map((r) => r.applicationId as string);

    let applicationJobs: Record<string, { title: string; company: string }> = {};

    if (applicationIds.length > 0) {
      const applications = await prisma.application.findMany({
        where: { id: { in: applicationIds } },
        include: { job: { select: { title: true, company: true } } },
      });

      applicationJobs = Object.fromEntries(
        applications.map((app) => [app.id, { title: app.job.title, company: app.job.company }])
      );
    }

    const enriched = resumes.map((r) => {
      const jobInfo = r.applicationId ? applicationJobs[r.applicationId] : null;
      return {
        id: r.id,
        name: r.name,
        type: r.type,
        originalFileName: r.originalFileName,
        fileType: r.fileType,
        version: r.version,
        isCurrent: r.isCurrent,
        conversionConfidence: r.conversionConfidence,
        conversionIssues: r.conversionIssues ? JSON.parse(r.conversionIssues) : [],
        applicationId: r.applicationId,
        jobTitle: jobInfo?.title ?? null,
        jobCompany: jobInfo?.company ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ resumes: enriched });
  } catch (error) {
    console.error("Error fetching all resumes:", error);
    return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 });
  }
}
