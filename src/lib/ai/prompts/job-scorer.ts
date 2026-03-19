export function buildJobScorerSystem(industry?: string): string {
  const industryContext = industry
    ? `The candidate works in ${industry}. You have deep expertise in ${industry} hiring, career paths, and what employers in this field look for.`
    : "";

  return `You are a world-class recruiter and career advisor with decades of experience across every industry. ${industryContext}

Score this job match honestly. Never inflate scores. Be direct about gaps.

Return JSON in this exact format:
{
  "fitScore": 0-100,
  "hireProbability": 0-100,
  "breakdown": {
    "skillMatch": { "score": 0-100, "details": "explanation" },
    "experienceMatch": { "score": 0-100, "details": "explanation" },
    "locationMatch": { "score": 0-100, "details": "explanation" },
    "salaryMatch": { "score": 0-100, "details": "explanation" }
  },
  "strengths": ["strength 1", "strength 2"],
  "gaps": ["gap 1", "gap 2"],
  "recommendation": "1-2 sentence honest recommendation"
}

Scoring guidelines:
- fitScore: How well does this job match what the candidate wants? Consider role, industry, location, salary, work style.
- hireProbability: How likely is the candidate to get an interview? Consider skills match, experience level, and competition.
- Be specific in details. Don't say "good match" - say "You have 7 of 9 required skills. Missing: Docker, AWS."
- If the candidate is underqualified, say so honestly. If overqualified, note that too.
- A 70+ fitScore means this is worth applying to. 40-69 means possible with adjustments. Below 40 means poor fit.`;
}

export function buildJobScorerMessage(
  profileData: {
    headline?: string | null;
    skills: string[];
    workHistory: Array<{ title: string; company: string; industry?: string | null }>;
    yearsExperience?: number | null;
    currentLocation?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    remotePreference?: string | null;
  },
  jobData: {
    title: string;
    company: string;
    location?: string | null;
    description?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    jobType?: string | null;
    remoteType?: string | null;
  }
): string {
  return `## Candidate Profile
Headline: ${profileData.headline || "Not set"}
Skills: ${profileData.skills.join(", ") || "None listed"}
Experience: ${profileData.yearsExperience || "Unknown"} years
Recent roles: ${profileData.workHistory.map((w) => `${w.title} at ${w.company}`).join("; ") || "None"}
Location: ${profileData.currentLocation || "Not specified"}
Salary range: ${profileData.salaryMin ? `$${profileData.salaryMin.toLocaleString()}` : "?"} - ${profileData.salaryMax ? `$${profileData.salaryMax.toLocaleString()}` : "?"}
Work style preference: ${profileData.remotePreference || "Any"}

## Job Listing
Title: ${jobData.title}
Company: ${jobData.company}
Location: ${jobData.location || "Not specified"}
Salary: ${jobData.salaryMin ? `$${jobData.salaryMin.toLocaleString()}` : "?"} - ${jobData.salaryMax ? `$${jobData.salaryMax.toLocaleString()}` : "?"}
Type: ${jobData.jobType || "Not specified"}
Remote: ${jobData.remoteType || "Not specified"}

Description:
${jobData.description || "No description available"}

Score this match.`;
}
