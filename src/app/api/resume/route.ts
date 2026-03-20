import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  const type = searchParams.get("type") || "original";

  try {
    const where: Record<string, unknown> = {
      userId: session.user.id,
      type,
    };

    if (applicationId) {
      where.applicationId = applicationId;
    }

    const resume = await prisma.resume.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (!resume) {
      return NextResponse.json({ resume: null });
    }

    return NextResponse.json({ resume });
  } catch (error) {
    console.error("Resume fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch resume" }, { status: 500 });
  }
}
