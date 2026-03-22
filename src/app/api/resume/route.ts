import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  const type = searchParams.get("type");
  const list = searchParams.get("list"); // "true" to get all matching

  try {
    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (type) where.type = type;
    if (applicationId) where.applicationId = applicationId;

    // List mode: return all matching resumes
    if (list === "true") {
      const resumes = await prisma.resume.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          type: true,
          originalFileName: true,
          fileType: true,
          version: true,
          isCurrent: true,
          conversionConfidence: true,
          applicationId: true,
          createdAt: true,
        },
      });
      return NextResponse.json({ resumes });
    }

    // Single resume mode (default): return most recent match
    if (!type) where.type = "original";

    const resume = await prisma.resume.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ resume: resume || null });
  } catch (error) {
    console.error("Resume fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch resume" }, { status: 500 });
  }
}
