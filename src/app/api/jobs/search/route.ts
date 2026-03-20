import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { registry } from "@/lib/jobs/plugin-registry";
import type { JobSearchParams } from "@/lib/jobs/plugins/types";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const location = searchParams.get("location") || undefined;
  const jobType = searchParams.get("jobType") as JobSearchParams["jobType"] | undefined;
  const remote = searchParams.get("remote") === "true" ? true : undefined;
  const salaryMin = searchParams.get("salaryMin") ? parseInt(searchParams.get("salaryMin")!) : undefined;
  const page = parseInt(searchParams.get("page") || "1");

  if (!query.trim()) {
    return NextResponse.json({ error: "Search query is required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { searchPreference: true },
  });

  const urgentMode = profile?.searchPreference?.urgentMode ?? false;

  const params: JobSearchParams = {
    query,
    location,
    jobType: urgentMode ? undefined : jobType,
    remote: urgentMode ? undefined : remote,
    salaryMin: urgentMode ? undefined : salaryMin,
    page,
    pageSize: 20,
  };

  try {
    const { results, totalResults, sources } = await registry.searchAll(params);

    // Save job listings to database and collect their database IDs
    const dbIdMap = new Map<string, string>();

    for (const job of results) {
      try {
        const saved = await prisma.jobListing.upsert({
          where: {
            externalId_source: {
              externalId: job.externalId,
              source: job.source,
            },
          },
          update: {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            jobType: job.jobType,
            remoteType: job.remoteType,
            url: job.url,
            postedDate: job.postedDate ? new Date(job.postedDate) : null,
            rawData: JSON.stringify(job.rawData),
          },
          create: {
            externalId: job.externalId,
            source: job.source,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            jobType: job.jobType,
            remoteType: job.remoteType,
            url: job.url,
            postedDate: job.postedDate ? new Date(job.postedDate) : null,
            rawData: JSON.stringify(job.rawData),
          },
        });
        dbIdMap.set(`${job.externalId}|${job.source}`, saved.id);
      } catch {
        // Non-critical
      }
    }

    // Check which jobs the user has already saved
    const savedJobs = await prisma.savedJob.findMany({
      where: { userId: session.user.id, dismissed: false },
      select: { jobId: true },
    });
    const savedJobIds = new Set(savedJobs.map((s) => s.jobId));

    const enrichedResults = results.map((job) => {
      const dbId = dbIdMap.get(`${job.externalId}|${job.source}`) || "";
      return {
        ...job,
        dbId,
        saved: savedJobIds.has(dbId),
      };
    });

    return NextResponse.json({
      results: enrichedResults,
      totalResults,
      page,
      sources,
      urgentMode,
      query,
      location: location || "",
    });
  } catch (err) {
    console.error("Job search error:", err);
    return NextResponse.json({ error: "Job search failed. Please try again." }, { status: 500 });
  }
}
