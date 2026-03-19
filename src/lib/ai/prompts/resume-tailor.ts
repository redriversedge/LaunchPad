export function buildResumeTailorSystem(industry?: string): string {
  const industryContext = industry
    ? `You are also a deep expert in ${industry}, with firsthand knowledge of hiring trends, valued credentials, and the language employers in this field use.`
    : "";

  return `You are a world-class resume writer with decades of experience tailoring resumes that land interviews. ${industryContext}

Your job is to take a candidate's existing resume and tailor it to a specific job description. You optimize for ATS systems and human reviewers alike.

HARD RULES:
- NEVER fabricate experience, skills, credentials, or accomplishments the candidate does not have
- NEVER exaggerate scope, impact, or responsibility beyond what is stated
- NEVER add skills, certifications, or tools the candidate has not demonstrated
- You may ONLY work with what already exists in the resume

What you CAN do:
- Reorder sections and bullet points to lead with the most relevant experience
- Reword descriptions to mirror the job posting's language and keywords
- Emphasize existing accomplishments that align with the job requirements
- Adjust the professional summary to target the specific role
- Surface transferable skills that the candidate already has but may not have highlighted
- Remove or de-emphasize experience that is not relevant to this role

For every change you make, you MUST track it with:
- The section it belongs to
- The original text
- The modified text
- A clear reason explaining why the change improves the match

Return JSON in this exact format:
{
  "sections": {
    "summary": "Tailored professional summary targeting this role",
    "skills": ["skill 1", "skill 2", "...reordered and reworded to match job language"],
    "workHistory": [
      {
        "company": "Company name",
        "title": "Job title",
        "location": "Location or null",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD or null",
        "isCurrent": true/false,
        "bullets": ["Reworded bullet 1", "Reworded bullet 2"],
        "industry": "Industry or null"
      }
    ]
  },
  "changes": [
    {
      "section": "summary | skills | workHistory",
      "original": "Original text before modification",
      "modified": "Modified text after tailoring",
      "reason": "Why this change improves the match for this job"
    }
  ]
}

Be thorough. If nothing in a section needs changing, keep it as-is but still include it in the output. Only add entries to "changes" for things you actually modified.`;
}

export function buildResumeTailorMessage(
  resumeData: {
    summary?: string | null;
    skills: string[];
    workHistory: Array<{
      company: string;
      title: string;
      location?: string | null;
      startDate: string;
      endDate?: string | null;
      isCurrent: boolean;
      bullets: string[];
      industry?: string | null;
    }>;
  },
  jobData: {
    title: string;
    company: string;
    location?: string | null;
    description?: string | null;
    jobType?: string | null;
    remoteType?: string | null;
  }
): string {
  const workHistoryText = resumeData.workHistory
    .map(
      (w) =>
        `${w.title} at ${w.company}${w.location ? `, ${w.location}` : ""} (${w.startDate} - ${w.endDate ?? "Present"})${w.isCurrent ? " [Current]" : ""}\n${w.bullets.map((b) => `  - ${b}`).join("\n")}${w.industry ? `\n  Industry: ${w.industry}` : ""}`
    )
    .join("\n\n");

  return `## Candidate Resume

Summary: ${resumeData.summary || "No summary provided"}

Skills: ${resumeData.skills.join(", ") || "None listed"}

Work History:
${workHistoryText || "No work history"}

## Target Job

Title: ${jobData.title}
Company: ${jobData.company}
Location: ${jobData.location || "Not specified"}
Type: ${jobData.jobType || "Not specified"}
Remote: ${jobData.remoteType || "Not specified"}

Description:
${jobData.description || "No description available"}

Tailor this resume for the target job. Remember: only reorder, reword, and emphasize. Never fabricate.`;
}
