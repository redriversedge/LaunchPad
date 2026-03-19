"use client";

import { useState } from "react";
import { JobCard } from "@/components/jobs/job-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface SearchResult {
  externalId: string;
  source: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
  remoteType?: string;
  url?: string;
  postedDate?: string;
  saved?: boolean;
  dbId?: string;
}

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [remote, setRemote] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  async function handleSearch(searchPage = 1) {
    if (!query.trim()) return;

    setSearching(true);
    setError("");

    const params = new URLSearchParams({ q: query, page: String(searchPage) });
    if (location) params.set("location", location);
    if (jobType) params.set("jobType", jobType);
    if (remote) params.set("remote", "true");

    try {
      const res = await fetch(`/api/jobs/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }

      if (searchPage === 1) {
        setResults(data.results);
      } else {
        setResults((prev) => [...prev, ...data.results]);
      }
      setTotalResults(data.totalResults);
      setSources(data.sources);
      setPage(searchPage);
      setSearched(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  function handleDismiss(jobId: string) {
    setResults((prev) => prev.filter((r) => r.dbId !== jobId));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Job Search</h1>

      {/* Search form */}
      <div className="card p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(1);
          }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field flex-1"
              placeholder="Job title, keywords, or company"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field sm:w-48"
              placeholder="City or state"
            />
            <button type="submit" disabled={searching || !query.trim()} className="btn-primary whitespace-nowrap">
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center text-sm">
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="input-field w-auto text-sm"
            >
              <option value="">All types</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
            </select>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={remote}
                onChange={(e) => setRemote(e.target.checked)}
                className="rounded text-brand-600"
              />
              <span>Remote only</span>
            </label>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {searching && results.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {searched && results.length === 0 && !searching && (
        <div className="text-center py-12">
          <p className="text-gray-600">No jobs found matching your search. Try different keywords or broaden your filters.</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {totalResults > 0 ? `${totalResults.toLocaleString()} results` : `${results.length} results`}
              {sources.length > 0 && ` from ${sources.join(", ")}`}
            </span>
          </div>

          <div className="space-y-3">
            {results.map((job, i) => (
              <JobCard
                key={`${job.externalId}-${job.source}-${i}`}
                id={job.dbId || ""}
                externalId={job.externalId}
                source={job.source}
                title={job.title}
                company={job.company}
                location={job.location}
                salaryMin={job.salaryMin}
                salaryMax={job.salaryMax}
                jobType={job.jobType}
                remoteType={job.remoteType}
                url={job.url}
                postedDate={job.postedDate}
                saved={job.saved}
                onDismiss={handleDismiss}
              />
            ))}
          </div>

          {totalResults > results.length && (
            <div className="text-center">
              <button
                onClick={() => handleSearch(page + 1)}
                disabled={searching}
                className="btn-secondary"
              >
                {searching ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {!searched && !searching && (
        <div className="text-center py-12 text-gray-500">
          <p>Enter a job title or keywords above to start searching.</p>
          <p className="text-sm mt-1">We search across multiple job boards to find the best matches for you.</p>
        </div>
      )}
    </div>
  );
}
