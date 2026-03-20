"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

const STORAGE_KEY = "launchpad-job-search";

function loadCachedSearch(): {
  results: SearchResult[];
  query: string;
  location: string;
  jobType: string;
  remote: boolean;
  totalResults: number;
  sources: string[];
} | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCachedSearch(data: {
  results: SearchResult[];
  query: string;
  location: string;
  jobType: string;
  remote: boolean;
  totalResults: number;
  sources: string[];
}) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

export default function JobsPage() {
  const router = useRouter();
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
  const [autoSearched, setAutoSearched] = useState(false);

  // On mount: restore cached search or auto-search from profile
  useEffect(() => {
    const cached = loadCachedSearch();
    if (cached && cached.results.length > 0) {
      setResults(cached.results);
      setQuery(cached.query);
      setLocation(cached.location);
      setJobType(cached.jobType);
      setRemote(cached.remote);
      setTotalResults(cached.totalResults);
      setSources(cached.sources);
      setSearched(true);
      return;
    }

    // No cache, try auto-search from profile
    autoSearchFromProfile();
  }, []);

  async function autoSearchFromProfile() {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();
      const profile = data.profile;
      if (!profile) return;

      // Build search query from profile data
      const terms: string[] = [];
      if (profile.headline) terms.push(profile.headline);
      else if (profile.targetIndustry) terms.push(profile.targetIndustry);
      else if (profile.workHistory?.length > 0) {
        terms.push(profile.workHistory[0].title);
      }

      if (terms.length === 0) return;

      const autoQuery = terms[0];
      const autoLocation = profile.currentLocation || "";

      setQuery(autoQuery);
      setLocation(autoLocation);
      setAutoSearched(true);

      await doSearch(autoQuery, autoLocation, "", false, 1);
    } catch {
      // Profile fetch failed, no auto-search
    }
  }

  const doSearch = useCallback(async (
    q: string,
    loc: string,
    jt: string,
    rem: boolean,
    searchPage: number,
  ) => {
    if (!q.trim()) return;
    setSearching(true);
    setError("");

    const params = new URLSearchParams({ q, page: String(searchPage) });
    if (loc) params.set("location", loc);
    if (jt) params.set("jobType", jt);
    if (rem) params.set("remote", "true");

    try {
      const res = await fetch(`/api/jobs/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }

      const newResults = searchPage === 1 ? data.results : [...results, ...data.results];
      setResults(newResults);
      setTotalResults(data.totalResults);
      setSources(data.sources);
      setPage(searchPage);
      setSearched(true);

      // Cache for tab persistence
      saveCachedSearch({
        results: newResults,
        query: q,
        location: loc,
        jobType: jt,
        remote: rem,
        totalResults: data.totalResults,
        sources: data.sources,
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [results]);

  function handleSearch(searchPage = 1) {
    doSearch(query, location, jobType, remote, searchPage);
  }

  function handleDismiss(jobId: string) {
    const updated = results.filter((r) => r.dbId !== jobId);
    setResults(updated);
    // Update cache
    saveCachedSearch({
      results: updated,
      query, location, jobType, remote, totalResults, sources,
    });
  }

  function handleTrack(applicationId: string) {
    router.push(`/applications/${applicationId}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">Job Search</h1>

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
            <label className="flex items-center gap-1.5 cursor-pointer dark:text-gray-300">
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
          <p className="text-gray-600 dark:text-gray-400">No jobs found matching your search. Try different keywords or broaden your filters.</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              {totalResults > 0 ? `${totalResults.toLocaleString()} results` : `${results.length} results`}
              {sources.length > 0 && ` from ${sources.join(", ")}`}
            </span>
            {autoSearched && (
              <span className="text-xs text-brand-600 dark:text-brand-400">
                Auto-searched from your profile
              </span>
            )}
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
                description={job.description}
                salaryMin={job.salaryMin}
                salaryMax={job.salaryMax}
                jobType={job.jobType}
                remoteType={job.remoteType}
                url={job.url}
                postedDate={job.postedDate}
                saved={job.saved}
                onDismiss={handleDismiss}
                onTrack={handleTrack}
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
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>Enter a job title or keywords above to start searching.</p>
          <p className="text-sm mt-1">We search across multiple job boards to find the best matches for you.</p>
        </div>
      )}
    </div>
  );
}
