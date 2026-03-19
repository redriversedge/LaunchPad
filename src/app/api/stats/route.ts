import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      status: true,
      appliedDate: true,
      responseDate: true,
    },
  });

  const total = applications.length;

  const byStatus: Record<string, number> = {
    saved: 0,
    applied: 0,
    interviewing: 0,
    offer: 0,
    rejected: 0,
  };

  for (const app of applications) {
    if (byStatus[app.status] !== undefined) {
      byStatus[app.status]++;
    }
  }

  // Response rate: of those that moved past "applied", how many got any response
  const appliedOrBeyond = applications.filter(
    (a) => a.status !== "saved"
  );
  const gotResponse = applications.filter(
    (a) => a.status === "interviewing" || a.status === "offer" || a.status === "rejected"
  );
  const responseRate = appliedOrBeyond.length > 0
    ? Math.round((gotResponse.length / appliedOrBeyond.length) * 100)
    : 0;

  // Interview rate: of applied+, how many reached interviewing or beyond
  const reachedInterview = applications.filter(
    (a) => a.status === "interviewing" || a.status === "offer"
  );
  const interviewRate = appliedOrBeyond.length > 0
    ? Math.round((reachedInterview.length / appliedOrBeyond.length) * 100)
    : 0;

  return NextResponse.json({
    total,
    byStatus,
    responseRate,
    interviewRate,
    appliedCount: appliedOrBeyond.length,
    responseCount: gotResponse.length,
    interviewCount: reachedInterview.length,
  });
}
