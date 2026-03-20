export function buildApplicationKitSystem(industry?: string): string {
  const industryContext = industry
    ? `The candidate works in ${industry}. You are deeply familiar with ${industry} hiring norms, common application questions, and what hiring managers in this space look for.`
    : "";

  return `You are an expert career coach who has guided thousands of candidates through the application process. ${industryContext}

Your job is to create a complete application kit that prepares the candidate to apply to this specific role. The kit should feel personal, not templated.

Rules:
- Everything must be truthful. Never fabricate experience, skills, or credentials.
- Tone: confident and professional, not desperate or generic.
- Tailor everything specifically to this company and role.
- Never use emojis.

Return JSON in this exact format:
{
  "coverLetter": "Full cover letter text with paragraph breaks using \\n\\n. 3-4 paragraphs, under 400 words.",
  "whyThisCompany": "A 2-3 sentence answer to 'Why do you want to work at [Company]?' that references specific company details.",
  "whyThisRole": "A 2-3 sentence answer to 'Why are you interested in this role?' connecting their experience to the job requirements.",
  "biggestStrength": "A concise answer to 'What is your greatest strength?' with a specific example from their work history.",
  "salaryAnswer": "Suggested response for salary expectation questions, based on the role and candidate's experience level.",
  "additionalNotes": "Any other advice specific to this application: things to emphasize, potential red flags to address proactively, or company-specific tips.",
  "applicationSteps": ["Step 1: description", "Step 2: description"],
  "estimatedTime": "Estimated time to complete the application (e.g., '15-20 minutes')"
}

The applicationSteps array should walk the candidate through exactly what to do, step by step, to submit this application. Be specific about what to copy-paste where.`;
}

export function buildApplicationKitMessage(
  profileData: {
    headline?: string | null;
    summary?: string | null;
    skills: string[];
    workHistory: Array<{
      title: string;
      company: string;
      description?: string | null;
      industry?: string | null;
      isCurrent: boolean;
    }>;
    yearsExperience?: number | null;
    currentLocation?: string | null;
    education: Array<{
      institution: string;
      degree: string;
      field?: string | null;
    }>;
    certifications: Array<{
      name: string;
      issuer?: string | null;
    }>;
    salaryMin?: number | null;
    salaryMax?: number | null;
  },
  jobData: {
    title: string;
    company: string;
    location?: string | null;
    description?: string | null;
    jobType?: string | null;
    remoteType?: string | null;
    url?: string | null;
  }
): string {
  const workHistoryText = profileData.workHistory
    .map(
      (w) =>
        `${w.title} at ${w.company}${w.isCurrent ? " (current)" : ""}${w.description ? ` - ${w.description}` : ""}`
    )
    .join("\n");

  const educationText = profileData.education
    .map((e) => `${e.degree}${e.field ? ` in ${e.field}` : ""} from ${e.institution}`)
    .join("\n");

  const certText = profileData.certifications
    .map((c) => `${c.name}${c.issuer ? ` (${c.issuer})` : ""}`)
    .join(", ");

  return `## Candidate Profile
Headline: ${profileData.headline || "Not set"}
Summary: ${profileData.summary || "Not provided"}
Skills: ${profileData.skills.join(", ") || "None listed"}
Experience: ${profileData.yearsExperience || "Unknown"} years
Location: ${profileData.currentLocation || "Not specified"}
Salary Expectations: ${profileData.salaryMin && profileData.salaryMax ? `$${profileData.salaryMin.toLocaleString()} - $${profileData.salaryMax.toLocaleString()}` : "Not specified"}

Work History:
${workHistoryText || "None"}

Education:
${educationText || "None"}

Certifications: ${certText || "None"}

## Target Job
Title: ${jobData.title}
Company: ${jobData.company}
Location: ${jobData.location || "Not specified"}
Type: ${jobData.jobType || "Not specified"}
Remote: ${jobData.remoteType || "Not specified"}
Application URL: ${jobData.url || "Not available"}

Job Description:
${jobData.description || "No description available"}

Create a complete application kit for this candidate targeting this specific role. Include a cover letter, common question answers, and step-by-step application instructions.`;
}
