import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">LaunchPad</h1>
          <div className="flex gap-3">
            <Link href="/login" className="btn-secondary text-sm">
              Log in
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Your AI-powered job search co-pilot
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            LaunchPad handles the tedious parts of job searching so you can focus on what matters.
            Upload your resume and let AI find, tailor, and prepare you for your next role.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              Get Started Free
            </Link>
            <Link href="/login" className="btn-secondary text-lg px-8 py-3">
              I have an account
            </Link>
          </div>

          {/* Value props */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
            <div className="p-4">
              <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Smart Resume Tailoring</h3>
              <p className="text-sm text-gray-600">
                AI optimizes your resume for each job, matching keywords and highlighting relevant experience.
              </p>
            </div>
            <div className="p-4">
              <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Intelligent Job Discovery</h3>
              <p className="text-sm text-gray-600">
                Find jobs that actually match your skills. AI scores every listing so you apply where you have the best shot.
              </p>
            </div>
            <div className="p-4">
              <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Interview Coaching</h3>
              <p className="text-sm text-gray-600">
                Practice with an AI interviewer who knows your industry. Get real feedback, not generic tips.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          LaunchPad - Built to help good people land great jobs.
        </div>
      </footer>
    </div>
  );
}
