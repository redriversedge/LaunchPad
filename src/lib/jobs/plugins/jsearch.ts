import type { JobSearchPlugin, JobSearchParams, JobSearchResponse, RawJobResult } from "./types";

const JSEARCH_BASE = "https://jsearch.p.rapidapi.com/search";

interface JSearchResult {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_description?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_employment_type?: string;
  job_is_remote?: boolean;
  job_apply_link?: string;
  job_posted_at_datetime_utc?: string;
}

interface JSearchResponse {
  data: JSearchResult[];
  status: string;
}

function formatLocation(r: JSearchResult): string | undefined {
  const parts = [r.job_city, r.job_state, r.job_country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function mapResult(r: JSearchResult): RawJobResult {
  return {
    externalId: r.job_id,
    source: "jsearch",
    title: r.job_title,
    company: r.employer_name,
    location: formatLocation(r),
    description: r.job_description,
    salaryMin: r.job_min_salary ? Math.round(r.job_min_salary) : undefined,
    salaryMax: r.job_max_salary ? Math.round(r.job_max_salary) : undefined,
    salaryCurrency: r.job_salary_currency || "USD",
    jobType: r.job_employment_type?.toLowerCase().replace("_", "-") || undefined,
    remoteType: r.job_is_remote ? "remote" : undefined,
    url: r.job_apply_link,
    postedDate: r.job_posted_at_datetime_utc,
    rawData: r as unknown as Record<string, unknown>,
  };
}

export const jsearchPlugin: JobSearchPlugin = {
  name: "jsearch",
  enabled: !!process.env.JSEARCH_RAPIDAPI_KEY,

  async search(params: JobSearchParams): Promise<JobSearchResponse> {
    const apiKey = process.env.JSEARCH_RAPIDAPI_KEY;

    if (!apiKey) {
      return { results: [], totalResults: 0, page: 1, hasMore: false };
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    let query = params.query;
    if (params.location) query += ` in ${params.location}`;

    const searchParams = new URLSearchParams({
      query,
      page: String(page),
      num_pages: "1",
    });

    if (params.remote) searchParams.set("remote_jobs_only", "true");
    if (params.jobType === "full-time") searchParams.set("employment_types", "FULLTIME");
    if (params.jobType === "part-time") searchParams.set("employment_types", "PARTTIME");
    if (params.jobType === "contract") searchParams.set("employment_types", "CONTRACTOR");

    const url = `${JSEARCH_BASE}?${searchParams.toString()}`;

    try {
      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });

      if (!res.ok) {
        console.error(`JSearch API error: ${res.status}`);
        return { results: [], totalResults: 0, page, hasMore: false };
      }

      const data: JSearchResponse = await res.json();
      const results = (data.data || []).map(mapResult);

      return {
        results,
        totalResults: results.length,
        page,
        hasMore: results.length >= pageSize,
      };
    } catch (error) {
      console.error("JSearch search error:", error);
      return { results: [], totalResults: 0, page, hasMore: false };
    }
  },
};
