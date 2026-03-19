import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (statusFilter) {
    where.status = statusFilter;
  }

  const applications = await prisma.application.findMany({
    where,
    include: {
      job: true,
      statusHistory: {
        orderBy: { changedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { jobId } = body;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const job = await prisma.jobListing.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const existing = await prisma.application.findFirst({
    where: { userId: session.user.id, jobId },
  });

  if (existing) {
    return NextResponse.json({ error: "Application already exists for this job", application: existing }, { status: 409 });
  }

  const application = await prisma.application.create({
    data: {
      userId: session.user.id,
      jobId,
      status: "saved",
    },
    include: { job: true },
  });

  return NextResponse.json({ application }, { status: 201 });
}
