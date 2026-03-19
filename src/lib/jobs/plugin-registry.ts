import { adzunaPlugin } from "./plugins/adzuna";
import { jsearchPlugin } from "./plugins/jsearch";
import type { JobSearchPlugin, JobSearchParams, RawJobResult } from "./plugins/types";

class PluginRegistry {
  private plugins: Map<string, JobSearchPlugin> = new Map();

  register(plugin: JobSearchPlugin) {
    this.plugins.set(plugin.name, plugin);
  }

  getEnabled(): JobSearchPlugin[] {
    return [...this.plugins.values()].filter((p) => p.enabled);
  }

  async searchAll(params: JobSearchParams): Promise<{
    results: RawJobResult[];
    totalResults: number;
    sources: string[];
  }> {
    const enabled = this.getEnabled();

    if (enabled.length === 0) {
      return { results: [], totalResults: 0, sources: [] };
    }

    const responses = await Promise.allSettled(
      enabled.map((p) => p.search(params))
    );

    const allResults: RawJobResult[] = [];
    let totalResults = 0;
    const sources: string[] = [];

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (response.status === "fulfilled") {
        allResults.push(...response.value.results);
        totalResults += response.value.totalResults;
        sources.push(enabled[i].name);
      } else {
        console.error(`Plugin ${enabled[i].name} failed:`, response.reason);
      }
    }

    // Deduplicate by title + company (case-insensitive)
    const seen = new Set<string>();
    const deduplicated = allResults.filter((job) => {
      const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { results: deduplicated, totalResults, sources };
  }
}

export const registry = new PluginRegistry();
registry.register(adzunaPlugin);
registry.register(jsearchPlugin);
