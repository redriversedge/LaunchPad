import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";

export default async function ResumesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const resumes = await prisma.resume.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  if (resumes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          title="No resumes yet"
          description="Upload your resume to get started. AI will parse your skills, experience, and education automatically."
          actionLabel="Upload Resume"
          actionHref="/resumes/upload"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Resumes</h1>
        <Link href="/resumes/upload" className="btn-primary text-sm">
          Upload New
        </Link>
      </div>

      <div className="space-y-3">
        {resumes.map((resume) => (
          <div key={resume.id} className="card p-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium">{resume.name}</h3>
              <div className="flex gap-3 mt-1 text-sm text-gray-500">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  resume.type === "original" ? "bg-gray-100 text-gray-600" : "bg-brand-50 text-brand-700"
                }`}>
                  {resume.type === "original" ? "Original" : "Tailored"}
                </span>
                {resume.originalFileName && <span>{resume.originalFileName}</span>}
                <span>{new Date(resume.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
