import type { JobSearchPlugin, JobSearchParams, JobSearchResponse, RawJobResult } from "./types";

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs/us/search";

interface AdzunaResult {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string; area?: string[] };
  description: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  redirect_url: string;
  created: string;
  category?: { label: string };
}

interface AdzunaResponse {
  results: AdzunaResult[];
  count: number;
}

function mapResult(r: AdzunaResult): RawJobResult {
  return {
    externalId: r.id,
    source: "adzuna",
    title: r.title,
    company: r.company.display_name,
    location: r.location.display_name,
    description: r.description,
    salaryMin: r.salary_min ? Math.round(r.salary_min) : undefined,
    salaryMax: r.salary_max ? Math.round(r.salary_max) : undefined,
    salaryCurrency: "USD",
    jobType: r.contract_time === "full_time" ? "full-time" : r.contract_time === "part_time" ? "part-time" : r.contract_time || undefined,
    url: r.redirect_url,
    postedDate: r.created,
    rawData: r as unknown as Record<string, unknown>,
  };
}

export const adzunaPlugin: JobSearchPlugin = {
  name: "adzuna",
  enabled: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),

  async search(params: JobSearchParams): Promise<JobSearchResponse> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {
      return { results: [], totalResults: 0, page: 1, hasMore: false };
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const searchParams = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: String(pageSize),
      what: params.query,
    });

    if (params.location) searchParams.set("where", params.location);
    if (params.salaryMin) searchParams.set("salary_min", String(params.salaryMin));
    if (params.salaryMax) searchParams.set("salary_max", String(params.salaryMax));
    if (params.jobType === "full-time") searchParams.set("full_time", "1");
    if (params.jobType === "part-time") searchParams.set("part_time", "1");

    const url = `${ADZUNA_BASE}/${page}?${searchParams.toString()}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Adzuna API error: ${res.status}`);
        return { results: [], totalResults: 0, page, hasMore: false };
      }

      const data: AdzunaResponse = await res.json();
      return {
        results: data.results.map(mapResult),
        totalResults: data.count,
        page,
        hasMore: page * pageSize < data.count,
      };
    } catch (error) {
      console.error("Adzuna search error:", error);
      return { results: [], totalResults: 0, page, hasMore: false };
    }
  },
};
