import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/ai/client";
import { buildApplicationKitSystem, buildApplicationKitMessage } from "@/lib/ai/prompts/application-kit";

interface ApplicationKit {
  coverLetter: string;
  whyThisCompany: string;
  whyThisRole: string;
  biggestStrength: string;
  salaryAnswer: string;
  additionalNotes: string;
  applicationSteps: string[];
  estimatedTime: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const application = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
    include: { job: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: {
      skills: true,
      workHistory: true,
      education: true,
      certifications: true,
      searchPreference: true,
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Please complete your profile first. Upload a resume and finish the intake questionnaire." },
      { status: 400 }
    );
  }

  try {
    const industry = profile.workHistory[0]?.industry || undefined;

    const kit = await callClaudeJSON<ApplicationKit>({
      system: buildApplicationKitSystem(industry),
      userMessage: buildApplicationKitMessage(
        {
          headline: profile.headline,
          summary: profile.summary,
          skills: profile.skills.map((s) => s.name),
          workHistory: profile.workHistory.map((w) => ({
            title: w.title,
            company: w.company,
            description: w.description,
            industry: w.industry,
            isCurrent: w.isCurrent,
          })),
          yearsExperience: profile.yearsExperience,
          currentLocation: profile.currentLocation,
          education: profile.education.map((e) => ({
            institution: e.institution,
            degree: e.degree,
            field: e.field,
          })),
          certifications: profile.certifications.map((c) => ({
            name: c.name,
            issuer: c.issuer,
          })),
          salaryMin: profile.searchPreference?.minSalary ?? null,
          salaryMax: null,
        },
        {
          title: application.job.title,
          company: application.job.company,
          location: application.job.location,
          description: application.job.description,
          jobType: application.job.jobType,
          remoteType: application.job.remoteType,
          url: application.job.url,
        }
      ),
    });

    // Save cover letter, append kit info to notes (preserve existing)
    const kitNotes = `--- AI Application Kit ---\nWhy this company: ${kit.whyThisCompany}\nWhy this role: ${kit.whyThisRole}\nBiggest strength: ${kit.biggestStrength}\nSalary answer: ${kit.salaryAnswer}\nAdditional notes: ${kit.additionalNotes}`;
    const existingNotes = application.applicationNotes || "";
    const updatedNotes = existingNotes
      ? existingNotes.replace(/--- AI Application Kit ---[\s\S]*$/, "").trim() + "\n\n" + kitNotes
      : kitNotes;

    await prisma.application.update({
      where: { id },
      data: {
        coverLetter: kit.coverLetter,
        applicationNotes: updatedNotes,
      },
    });

    return NextResponse.json({ kit });
  } catch (error) {
    console.error("Application kit generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate application kit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
