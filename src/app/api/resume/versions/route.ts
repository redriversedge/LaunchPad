import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/resume/versions
 * List all resume versions (current + up to 3 previous)
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const versions = await prisma.resume.findMany({
      where: { userId: session.user.id, type: "original" },
      orderBy: { version: "desc" },
      select: {
        id: true,
        name: true,
        version: true,
        isCurrent: true,
        originalFileName: true,
        fileType: true,
        conversionConfidence: true,
        conversionIssues: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      versions: versions.map((v) => ({
        ...v,
        conversionIssues: v.conversionIssues ? JSON.parse(v.conversionIssues) : [],
      })),
    });
  } catch (error) {
    console.error("Error listing resume versions:", error);
    return NextResponse.json({ error: "Failed to list resume versions" }, { status: 500 });
  }
}
