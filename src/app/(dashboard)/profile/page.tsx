import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileStrengthMeter } from "@/components/profile/profile-strength-meter";
import { EmptyState } from "@/components/shared/empty-state";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: {
      skills: true,
      workHistory: { orderBy: { startDate: "desc" } },
      education: { orderBy: { endDate: "desc" } },
      certifications: true,
    },
  });

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          title="No profile yet"
          description="Upload your resume to create your profile automatically, or complete the intake interview."
          actionLabel="Upload Resume"
          actionHref="/resumes/upload"
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header with strength meter */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
        <ProfileStrengthMeter score={profile.profileStrength} />
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-bold">{session.user.name || "Your Profile"}</h1>
          {profile.headline && <p className="text-gray-600 mt-1">{profile.headline}</p>}
          {profile.currentLocation && (
            <p className="text-sm text-gray-500 mt-1">{profile.currentLocation}</p>
          )}
          <div className="flex gap-3 mt-3 justify-center sm:justify-start">
            <Link href="/profile/edit" className="btn-secondary text-sm">
              Edit Profile
            </Link>
            {!profile.intakeCompleted && (
              <Link href="/intake" className="btn-primary text-sm">
                Complete Intake
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {profile.summary && (
        <div className="card p-6">
          <h2 className="font-semibold mb-2">Summary</h2>
          <p className="text-sm text-gray-700">{profile.summary}</p>
        </div>
      )}

      {/* Preferences */}
      <div className="card p-6">
        <h2 className="font-semibold mb-3">Job Preferences</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Industry</span>
            <p className="font-medium">{profile.targetIndustry || "Not set"}</p>
          </div>
          <div>
            <span className="text-gray-500">Work Style</span>
            <p className="font-medium capitalize">{profile.remotePreference || "Not set"}</p>
          </div>
          <div>
            <span className="text-gray-500">Salary Range</span>
            <p className="font-medium">
              {profile.salaryMin
                ? `$${profile.salaryMin.toLocaleString()}${profile.salaryMax ? ` - $${profile.salaryMax.toLocaleString()}` : "+"}`
                : "Not set"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Experience</span>
            <p className="font-medium">
              {profile.yearsExperience ? `${profile.yearsExperience} years` : "Not set"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Relocate</span>
            <p className="font-medium">{profile.willingToRelocate ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      {/* Skills */}
      {profile.skills.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span
                key={skill.id}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  skill.category === "technical"
                    ? "bg-blue-50 text-blue-700"
                    : skill.category === "tool"
                    ? "bg-purple-50 text-purple-700"
                    : skill.category === "industry"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {skill.name}
                {skill.level && (
                  <span className="ml-1 opacity-60">({skill.level})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Work History */}
      {profile.workHistory.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Work History</h2>
          <div className="space-y-4">
            {profile.workHistory.map((job) => {
              const bullets = job.bullets ? JSON.parse(job.bullets) : [];
              return (
                <div key={job.id} className="border-l-2 border-gray-200 pl-4">
                  <h3 className="font-medium">{job.title}</h3>
                  <p className="text-sm text-gray-600">{job.company}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(job.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    {" - "}
                    {job.isCurrent
                      ? "Present"
                      : job.endDate
                      ? new Date(job.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                      : ""}
                    {job.location && ` | ${job.location}`}
                  </p>
                  {bullets.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {(bullets as string[]).map((b: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-gray-400 mt-1 flex-shrink-0">-</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Education */}
      {profile.education.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Education</h2>
          <div className="space-y-3">
            {profile.education.map((edu) => (
              <div key={edu.id}>
                <h3 className="font-medium">{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</h3>
                <p className="text-sm text-gray-600">{edu.institution}</p>
                {edu.endDate && (
                  <p className="text-xs text-gray-500">
                    {new Date(edu.endDate).toLocaleDateString("en-US", { year: "numeric" })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {profile.certifications.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Certifications</h2>
          <div className="space-y-2">
            {profile.certifications.map((cert) => (
              <div key={cert.id} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                <span className="text-sm font-medium">{cert.name}</span>
                {cert.issuer && <span className="text-xs text-gray-500">({cert.issuer})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
