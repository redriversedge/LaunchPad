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

  // Check if user is in urgent mode
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

  const { results, totalResults, sources } = await registry.searchAll(params);

  // Save job listings to database for future reference
  for (const job of results) {
    try {
      await prisma.jobListing.upsert({
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
    } catch {
      // Non-critical: job may already exist with null externalId
    }
  }

  // Check which jobs the user has already saved
  const savedJobIds = new Set(
    (
      await prisma.savedJob.findMany({
        where: { userId: session.user.id },
        select: { jobId: true },
      })
    ).map((s) => s.jobId)
  );

  // Get saved job listings to map external IDs
  const savedListings = await prisma.jobListing.findMany({
    where: { id: { in: [...savedJobIds] } },
    select: { id: true, externalId: true, source: true },
  });
  const savedExternalIds = new Set(
    savedListings.map((l) => `${l.externalId}|${l.source}`)
  );

  const enrichedResults = results.map((job) => ({
    ...job,
    saved: savedExternalIds.has(`${job.externalId}|${job.source}`),
  }));

  return NextResponse.json({
    results: enrichedResults,
    totalResults,
    page,
    sources,
    urgentMode,
  });
}
