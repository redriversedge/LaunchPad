export function buildInterviewPrepSystem(industry?: string): string {
  const industryContext = industry
    ? `You specialize in ${industry}. You have hired hundreds of people in ${industry}, understand the exact competencies that matter, know what separates good candidates from great ones, and can speak to day-to-day realities of the work.`
    : "You adapt your coaching to any industry, drawing on broad hiring experience across sectors.";

  return `You are a world-class career coach and interview strategist who is also a deep industry expert in the candidate's field. ${industryContext}

Your job is to generate a comprehensive interview prep package that gives the candidate a genuine edge. Everything you produce must be specific, actionable, and grounded in the candidate's real experience.

Return JSON in this exact format:
{
  "starAnswers": [
    {
      "question": "Tell me about a time you...",
      "situation": "Specific context from the candidate's background",
      "task": "What they needed to accomplish",
      "action": "Concrete steps they took",
      "result": "Measurable outcome or impact"
    }
  ],
  "questionsToAsk": [
    {
      "question": "The question to ask the interviewer",
      "why": "Why this question demonstrates insight and genuine interest"
    }
  ],
  "salaryTalking": [
    {
      "point": "A specific talking point for salary negotiation",
      "context": "Supporting data or reasoning"
    }
  ],
  "redFlags": [
    {
      "flag": "A potential concern the interviewer might raise",
      "response": "How to address it honestly and turn it into a strength"
    }
  ],
  "keyThemes": [
    {
      "theme": "A key narrative thread to weave through the interview",
      "examples": "How to reinforce this theme with specific examples"
    }
  ]
}

Guidelines:
- Generate exactly 5 STAR answers. Use the candidate's REAL work history and skills to craft them. Do not invent experience they don't have.
- STAR answers should target the most likely behavioral questions for this specific role and company.
- Generate exactly 5 questions to ask the interviewer. These should demonstrate genuine insight about the company and role, not generic questions anyone could ask.
- Salary talking points should reference market data, the candidate's experience level, and the specific role's compensation landscape.
- Red flags should honestly address any gaps, job changes, or skill mismatches visible in the candidate's profile. Provide direct, non-defensive responses.
- Key themes should be 3-5 narrative threads that tie the candidate's experience to what this role needs.
- Be direct. No fluff. Every word should serve the candidate's preparation.`;
}

export function buildInterviewPrepMessage(
  profileData: {
    headline?: string | null;
    summary?: string | null;
    skills: string[];
    workHistory: Array<{
      title: string;
      company: string;
      description?: string | null;
      bullets?: string | null;
      industry?: string | null;
      startDate: string;
      endDate?: string | null;
      isCurrent: boolean;
    }>;
    education: Array<{
      institution: string;
      degree: string;
      field?: string | null;
    }>;
    yearsExperience?: number | null;
    currentLocation?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
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
  },
  companyInfo?: string | null
): string {
  const workHistoryText = profileData.workHistory
    .map((w) => {
      const period = `${w.startDate}${w.isCurrent ? " - Present" : w.endDate ? ` - ${w.endDate}` : ""}`;
      const desc = w.description ? `\n  Description: ${w.description}` : "";
      const bullets = w.bullets ? `\n  Key accomplishments: ${w.bullets}` : "";
      return `- ${w.title} at ${w.company} (${period})${desc}${bullets}`;
    })
    .join("\n");

  const educationText = profileData.education
    .map((e) => `- ${e.degree}${e.field ? ` in ${e.field}` : ""} from ${e.institution}`)
    .join("\n");

  const companySection = companyInfo
    ? `\n## Company Research\n${companyInfo}\n`
    : "";

  return `## Candidate Profile
Headline: ${profileData.headline || "Not set"}
Summary: ${profileData.summary || "Not provided"}
Skills: ${profileData.skills.join(", ") || "None listed"}
Experience: ${profileData.yearsExperience || "Unknown"} years
Location: ${profileData.currentLocation || "Not specified"}
Target salary: ${profileData.salaryMin ? `$${profileData.salaryMin.toLocaleString()}` : "?"} - ${profileData.salaryMax ? `$${profileData.salaryMax.toLocaleString()}` : "?"}

## Work History
${workHistoryText || "No work history provided"}

## Education
${educationText || "No education listed"}

## Target Job
Title: ${jobData.title}
Company: ${jobData.company}
Location: ${jobData.location || "Not specified"}
Salary: ${jobData.salaryMin ? `$${jobData.salaryMin.toLocaleString()}` : "?"} - ${jobData.salaryMax ? `$${jobData.salaryMax.toLocaleString()}` : "?"}
Type: ${jobData.jobType || "Not specified"}
Remote: ${jobData.remoteType || "Not specified"}

Description:
${jobData.description || "No description available"}
${companySection}
Generate a complete interview prep package for this candidate and role.`;
}
