export interface UserProfile {
  id: string;
  userId: string;
  headline: string | null;
  summary: string | null;
  yearsExperience: number | null;
  currentLocation: string | null;
  willingToRelocate: boolean;
  relocationCities: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  remotePreference: string | null;
  targetIndustry: string | null;
  profileStrength: number;
  intakeCompleted: boolean;
  skills: ProfileSkill[];
  workHistory: ProfileWorkHistory[];
  education: ProfileEducation[];
  certifications: ProfileCertification[];
}

export interface ProfileSkill {
  id: string;
  name: string;
  category: string | null;
  level: string | null;
  yearsUsed: number | null;
}

export interface ProfileWorkHistory {
  id: string;
  company: string;
  title: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  bullets: string[];
  industry: string | null;
}

export interface ProfileEducation {
  id: string;
  institution: string;
  degree: string;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  gpa: number | null;
}

export interface ProfileCertification {
  id: string;
  name: string;
  issuer: string | null;
  dateObtained: string | null;
  expiryDate: string | null;
}

export interface IntakeQuestion {
  id: string;
  text: string;
  type: "text" | "select" | "multiselect";
  options?: string[];
}

export interface IntakeResponse {
  questions: IntakeQuestion[];
  message: string;
  complete?: boolean;
}

export interface ResumeData {
  id: string;
  name: string;
  type: string;
  originalFileName: string | null;
  structuredData: string | null;
  createdAt: string;
}

export function calculateProfileStrength(profile: {
  headline: string | null;
  summary: string | null;
  currentLocation: string | null;
  salaryMin: number | null;
  remotePreference: string | null;
  targetIndustry: string | null;
  intakeCompleted: boolean;
  skills: { length: number };
  workHistory: { length: number };
  education: { length: number };
}): number {
  let score = 0;
  const weights = {
    headline: 10,
    summary: 10,
    location: 10,
    salary: 10,
    remote: 5,
    industry: 5,
    intake: 15,
    skills: 15,
    workHistory: 15,
    education: 5,
  };

  if (profile.headline) score += weights.headline;
  if (profile.summary) score += weights.summary;
  if (profile.currentLocation) score += weights.location;
  if (profile.salaryMin) score += weights.salary;
  if (profile.remotePreference) score += weights.remote;
  if (profile.targetIndustry) score += weights.industry;
  if (profile.intakeCompleted) score += weights.intake;
  if (profile.skills.length > 0) score += Math.min(weights.skills, profile.skills.length * 3);
  if (profile.workHistory.length > 0) score += Math.min(weights.workHistory, profile.workHistory.length * 5);
  if (profile.education.length > 0) score += weights.education;

  return Math.min(100, score);
}
