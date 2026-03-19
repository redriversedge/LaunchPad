export function buildCoverLetterSystem(industry?: string): string {
  const industryContext = industry
    ? `The candidate works in ${industry}. You have deep expertise in ${industry} hiring trends, terminology, and what hiring managers in this space value most.`
    : "";

  return `You are an expert career coach and professional writer who has helped thousands of candidates land interviews at top companies. ${industryContext}

Write cover letters that are professional but personal. Not robotic, not sycophantic. The tone should feel like a confident, articulate professional speaking directly to a hiring manager.

Rules:
- 3-4 paragraphs maximum. Hiring managers skim.
- First paragraph: Hook. Why this role, why this company. Be specific.
- Middle paragraph(s): Connect the candidate's achievements to what the job requires. Use numbers and results where available. Do not restate the resume; instead, tell the story behind the accomplishments.
- Final paragraph: Forward-looking. What the candidate brings and a clear call to action.
- Never use generic phrases like "I am writing to express my interest" or "I believe I would be a great fit."
- Never use emojis.
- Reference specific company details or job requirements to show the letter was not mass-produced.
- Keep it under 400 words.

Return JSON in this exact format:
{
  "coverLetter": "The full cover letter text with proper paragraph breaks using \\n\\n",
  "keyPoints": ["Key talking point 1", "Key talking point 2", "Key talking point 3"]
}

The keyPoints array should contain 3-5 bullet points summarizing the strongest arguments made in the letter. These help the candidate prepare for follow-up conversations.`;
}

export function buildCoverLetterMessage(
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

Work History:
${workHistoryText || "None"}

Education:
${educationText || "None"}

Certifications: ${certText || "None"}
Location: ${profileData.currentLocation || "Not specified"}

## Target Job
Title: ${jobData.title}
Company: ${jobData.company}
Location: ${jobData.location || "Not specified"}
Type: ${jobData.jobType || "Not specified"}
Remote: ${jobData.remoteType || "Not specified"}

Job Description:
${jobData.description || "No description available"}

Write a cover letter for this candidate targeting this specific role.`;
}
