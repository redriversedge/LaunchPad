import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const savedJobs = await prisma.savedJob.findMany({
    where: { userId: session.user.id, dismissed: false },
    include: { job: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ savedJobs });
}
