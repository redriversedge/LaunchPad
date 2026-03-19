import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/ai/client";
import { buildIntakeSystemPrompt, buildFollowUpPrompt } from "@/lib/ai/prompts/intake-questions";
import { calculateProfileStrength } from "@/types";
import type { IntakeResponse } from "@/types";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { skills: true, workHistory: true, education: true },
  });

  if (profile?.intakeCompleted) {
    return NextResponse.json({ complete: true, message: "Intake already completed." });
  }

  const systemPrompt = buildIntakeSystemPrompt(profile?.targetIndustry ?? undefined);
  const profileSummary = profile
    ? `Name: ${(await prisma.user.findUnique({ where: { id: session.user.id } }))?.name || "Unknown"}
Headline: ${profile.headline || "Not set"}
Location: ${profile.currentLocation || "Not set"}
Experience: ${profile.yearsExperience ? profile.yearsExperience + " years" : "Unknown"}
Skills: ${profile.skills.map((s) => s.name).join(", ") || "None yet"}
Work History: ${profile.workHistory.map((w) => `${w.title} at ${w.company}`).join("; ") || "None yet"}
Salary Range: ${profile.salaryMin ? `$${profile.salaryMin.toLocaleString()} - $${profile.salaryMax?.toLocaleString()}` : "Not set"}
Remote Preference: ${profile.remotePreference || "Not set"}
Target Industry: ${profile.targetIndustry || "Not set"}`
    : "No profile data yet. This is a fresh start.";

  const result = await callClaudeJSON<IntakeResponse>({
    system: systemPrompt,
    userMessage: `Generate initial intake questions for this candidate:\n\n${profileSummary}`,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { answers, requestFollowUp } = body;

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { skills: true, workHistory: true, education: true },
  });

  // Save answers to profile
  const existingAnswers = profile?.intakeAnswers ? JSON.parse(profile.intakeAnswers) : {};
  const allAnswers = { ...existingAnswers, ...answers };

  // Extract structured data from answers and update profile
  const profileUpdates: Record<string, unknown> = {
    intakeAnswers: JSON.stringify(allAnswers),
  };

  // Process known answer types
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value !== "string") continue;
    const lower = key.toLowerCase();
    if (lower.includes("salary") || lower.includes("compensation")) {
      const nums = value.match(/\d[\d,]*/g);
      if (nums && nums.length >= 1) {
        profileUpdates.salaryMin = parseInt(nums[0].replace(/,/g, ""));
        if (nums.length >= 2) profileUpdates.salaryMax = parseInt(nums[1].replace(/,/g, ""));
      }
    }
    if (lower.includes("location") || lower.includes("city") || lower.includes("where")) {
      if (!profile?.currentLocation) profileUpdates.currentLocation = value;
    }
    if (lower.includes("remote") || lower.includes("hybrid") || lower.includes("onsite")) {
      const v = value.toLowerCase();
      if (v.includes("remote")) profileUpdates.remotePreference = "remote";
      else if (v.includes("hybrid")) profileUpdates.remotePreference = "hybrid";
      else if (v.includes("onsite") || v.includes("in-person")) profileUpdates.remotePreference = "onsite";
    }
    if (lower.includes("industry") || lower.includes("field") || lower.includes("sector")) {
      profileUpdates.targetIndustry = value;
    }
  }

  const updatedProfile = await prisma.profile.upsert({
    where: { userId: session.user.id },
    update: profileUpdates,
    create: {
      userId: session.user.id,
      ...profileUpdates,
      intakeAnswers: JSON.stringify(allAnswers),
    },
    include: { skills: true, workHistory: true, education: true },
  });

  if (requestFollowUp) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const profileSummary = `Name: ${user?.name || "Unknown"}
Headline: ${updatedProfile.headline || "Not set"}
Location: ${updatedProfile.currentLocation || "Not set"}
Experience: ${updatedProfile.yearsExperience ? updatedProfile.yearsExperience + " years" : "Unknown"}
Skills: ${updatedProfile.skills.map((s) => s.name).join(", ") || "None yet"}
Salary Range: ${updatedProfile.salaryMin ? `$${updatedProfile.salaryMin.toLocaleString()} - $${updatedProfile.salaryMax?.toLocaleString()}` : "Not set"}
Remote Preference: ${updatedProfile.remotePreference || "Not set"}
Target Industry: ${updatedProfile.targetIndustry || "Not set"}`;

    const result = await callClaudeJSON<IntakeResponse>({
      system: buildFollowUpPrompt(
        profileSummary,
        JSON.stringify(allAnswers, null, 2),
        updatedProfile.targetIndustry ?? undefined
      ),
      userMessage: "Generate follow-up questions based on the candidate's answers so far.",
    });

    if (result.complete) {
      const strength = calculateProfileStrength(updatedProfile);
      await prisma.profile.update({
        where: { id: updatedProfile.id },
        data: { intakeCompleted: true, profileStrength: strength },
      });
    }

    return NextResponse.json(result);
  }

  // Mark intake as complete
  const strength = calculateProfileStrength(updatedProfile);
  await prisma.profile.update({
    where: { id: updatedProfile.id },
    data: { intakeCompleted: true, profileStrength: strength },
  });

  return NextResponse.json({
    complete: true,
    message: "Intake complete! Your profile has been updated.",
    profileStrength: strength,
  });
}
