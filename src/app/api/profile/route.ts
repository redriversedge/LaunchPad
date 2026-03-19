import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { calculateProfileStrength } from "@/types";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: {
      skills: true,
      workHistory: { orderBy: { startDate: "desc" } },
      education: { orderBy: { endDate: "desc" } },
      certifications: true,
      searchPreference: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const profile = await prisma.profile.upsert({
    where: { userId: session.user.id },
    update: {
      headline: body.headline,
      summary: body.summary,
      yearsExperience: body.yearsExperience,
      currentLocation: body.currentLocation,
      willingToRelocate: body.willingToRelocate,
      salaryMin: body.salaryMin,
      salaryMax: body.salaryMax,
      remotePreference: body.remotePreference,
      targetIndustry: body.targetIndustry,
    },
    create: {
      userId: session.user.id,
      headline: body.headline,
      summary: body.summary,
      yearsExperience: body.yearsExperience,
      currentLocation: body.currentLocation,
      willingToRelocate: body.willingToRelocate ?? false,
      salaryMin: body.salaryMin,
      salaryMax: body.salaryMax,
      remotePreference: body.remotePreference,
      targetIndustry: body.targetIndustry,
    },
    include: { skills: true, workHistory: true, education: true },
  });

  const strength = calculateProfileStrength(profile);
  await prisma.profile.update({
    where: { id: profile.id },
    data: { profileStrength: strength },
  });

  return NextResponse.json({ profile: { ...profile, profileStrength: strength } });
}
