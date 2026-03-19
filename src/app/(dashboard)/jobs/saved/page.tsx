import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";

export default async function SavedJobsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const savedJobs = await prisma.savedJob.findMany({
    where: { userId: session.user.id, dismissed: false },
    include: { job: true },
    orderBy: { createdAt: "desc" },
  });

  if (savedJobs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Saved Jobs</h1>
        <EmptyState
          title="No saved jobs yet"
          description="Jobs you save from search results will appear here. Save jobs you're interested in to compare and apply later."
          actionLabel="Search Jobs"
          actionHref="/jobs"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Saved Jobs</h1>
        <Link href="/jobs" className="btn-secondary text-sm">
          Search More
        </Link>
      </div>

      <div className="space-y-3">
        {savedJobs.map((saved) => {
          const job = saved.job;
          const scoreColor = saved.fitScore
            ? saved.fitScore >= 70
              ? "bg-green-100 text-green-700"
              : saved.fitScore >= 40
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
            : null;

          return (
            <div key={saved.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/jobs/${job.id}`} className="font-semibold hover:text-brand-600">
                      {job.title}
                    </Link>
                    {scoreColor && saved.fitScore && (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${scoreColor}`}>
                        Fit: {saved.fitScore}
                      </span>
                    )}
                    {saved.hireProbability && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Hire: {saved.hireProbability}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{job.company}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    {job.location && <span>{job.location}</span>}
                    {(job.salaryMin || job.salaryMax) && (
                      <span>
                        {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : ""}
                        {job.salaryMin && job.salaryMax ? " - " : ""}
                        {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : ""}
                      </span>
                    )}
                    {job.jobType && <span className="capitalize">{job.jobType}</span>}
                    <span>Saved {new Date(saved.createdAt).toLocaleDateString()}</span>
                  </div>
                  {saved.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">{saved.notes}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs"
                    >
                      Apply
                    </a>
                  )}
                  <Link href={`/jobs/${job.id}`} className="btn-secondary text-xs">
                    Details
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
