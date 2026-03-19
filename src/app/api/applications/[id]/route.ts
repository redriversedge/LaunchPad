import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const application = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
    include: {
      job: true,
      statusHistory: {
        orderBy: { changedAt: "asc" },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({ application });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const existing = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const allowedFields: Record<string, unknown> = {};
  if (body.applicationNotes !== undefined) allowedFields.applicationNotes = body.applicationNotes;
  if (body.coverLetter !== undefined) allowedFields.coverLetter = body.coverLetter;
  if (body.followUpDate !== undefined) allowedFields.followUpDate = body.followUpDate ? new Date(body.followUpDate) : null;
  if (body.offerAmount !== undefined) allowedFields.offerAmount = body.offerAmount;
  if (body.rejectionReason !== undefined) allowedFields.rejectionReason = body.rejectionReason;
  if (body.interviewRounds !== undefined) allowedFields.interviewRounds = body.interviewRounds;

  const application = await prisma.application.update({
    where: { id },
    data: allowedFields,
    include: { job: true },
  });

  return NextResponse.json({ application });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  await prisma.application.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
