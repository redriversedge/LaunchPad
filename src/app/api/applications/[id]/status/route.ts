import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES = ["saved", "applied", "interviewing", "offer", "rejected"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { status, note } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const application = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (application.status === status) {
    return NextResponse.json({ error: "Application is already in this status" }, { status: 400 });
  }

  const updatedData: Record<string, unknown> = { status };

  if (status === "applied" && !application.appliedDate) {
    updatedData.appliedDate = new Date();
  }
  if (status === "interviewing" || status === "offer" || status === "rejected") {
    if (!application.responseDate) {
      updatedData.responseDate = new Date();
    }
  }

  const [updatedApplication] = await prisma.$transaction([
    prisma.application.update({
      where: { id },
      data: updatedData,
      include: { job: true },
    }),
    prisma.statusChange.create({
      data: {
        applicationId: id,
        fromStatus: application.status,
        toStatus: status,
        note: note || null,
      },
    }),
  ]);

  return NextResponse.json({ application: updatedApplication });
}
