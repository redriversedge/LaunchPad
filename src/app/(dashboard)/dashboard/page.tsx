import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileStrengthMeter } from "@/components/profile/profile-strength-meter";
import { calculateProfileStrength } from "@/types";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { skills: true, workHistory: true, education: true },
  });

  const resumeCount = await prisma.resume.count({
    where: { userId: session.user.id },
  });

  const applicationCount = await prisma.application.count({
    where: { userId: session.user.id },
  });

  const savedJobCount = await prisma.savedJob.count({
    where: { userId: session.user.id, dismissed: false },
  });

  const strength = profile
    ? calculateProfileStrength(profile)
    : 0;

  const hasResume = resumeCount > 0;
  const hasProfile = !!profile;
  const intakeDone = profile?.intakeCompleted ?? false;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Welcome back, {session.user.name?.split(" ")[0] || "there"}</h1>

      {/* Profile Strength + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 flex items-center gap-6">
          <ProfileStrengthMeter score={strength} />
          <div>
            <h2 className="font-semibold text-lg mb-1">Profile Strength</h2>
            {strength < 40 && (
              <p className="text-sm text-gray-600">
                Your profile needs more detail to get good job matches.
              </p>
            )}
            {strength >= 40 && strength < 70 && (
              <p className="text-sm text-gray-600">
                Good start. Complete the intake to unlock better matches.
              </p>
            )}
            {strength >= 70 && (
              <p className="text-sm text-gray-600">
                Looking strong. Your profile is ready for quality job matches.
              </p>
            )}
            <Link
              href={!hasProfile ? "/resumes/upload" : !intakeDone ? "/intake" : "/profile"}
              className="btn-primary text-sm mt-3 inline-block"
            >
              {!hasResume ? "Upload Resume" : !intakeDone ? "Complete Intake" : "View Profile"}
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card p-6">
          <h2 className="font-semibold text-lg mb-4">Quick Stats</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-brand-600">{savedJobCount}</div>
              <div className="text-xs text-gray-500">Saved Jobs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-600">{applicationCount}</div>
              <div className="text-xs text-gray-500">Applications</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-600">{resumeCount}</div>
              <div className="text-xs text-gray-500">Resumes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started Steps */}
      {strength < 70 && (
        <div className="card p-6">
          <h2 className="font-semibold text-lg mb-4">Getting Started</h2>
          <div className="space-y-3">
            <Step
              number={1}
              title="Upload your resume"
              description="We'll extract your skills, experience, and education automatically."
              done={hasResume}
              href="/resumes/upload"
            />
            <Step
              number={2}
              title="Complete the intake interview"
              description="Tell us more about what you're looking for. Takes about 5 minutes."
              done={intakeDone}
              href="/intake"
            />
            <Step
              number={3}
              title="Search for jobs"
              description="Find opportunities that match your skills and preferences."
              done={false}
              href="/jobs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Step({
  number,
  title,
  description,
  done,
  href,
}: {
  number: number;
  title: string;
  description: string;
  done: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          done
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {done ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          number
        )}
      </div>
      <div>
        <h3 className={`font-medium text-sm ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>
          {title}
        </h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </Link>
  );
}
