import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const body = await request.json().catch(() => ({}));
  const dismiss = body.dismiss === true;
  const notes = body.notes || null;

  const job = await prisma.jobListing.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const savedJob = await prisma.savedJob.upsert({
    where: { userId_jobId: { userId: session.user.id, jobId } },
    update: {
      dismissed: dismiss,
      notes: notes !== null ? notes : undefined,
    },
    create: {
      userId: session.user.id,
      jobId,
      dismissed: dismiss,
      notes,
    },
  });

  return NextResponse.json({ savedJob });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  await prisma.savedJob.deleteMany({
    where: { userId: session.user.id, jobId },
  });

  return NextResponse.json({ success: true });
}
