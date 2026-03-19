export interface JobSearchParams {
  query: string;
  location?: string;
  radius?: number;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: "full-time" | "part-time" | "contract";
  remote?: boolean;
  page?: number;
  pageSize?: number;
}

export interface RawJobResult {
  externalId: string;
  source: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  jobType?: string;
  remoteType?: string;
  url?: string;
  postedDate?: string;
  rawData?: Record<string, unknown>;
}

export interface JobSearchResponse {
  results: RawJobResult[];
  totalResults: number;
  page: number;
  hasMore: boolean;
}

export interface JobSearchPlugin {
  name: string;
  enabled: boolean;
  search(params: JobSearchParams): Promise<JobSearchResponse>;
  getJob?(externalId: string): Promise<RawJobResult | null>;
}
