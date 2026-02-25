export interface MissingKeyword {
    keyword: string;
    priority: "high" | "medium" | "low";
    context: string;
}

export interface Suggestion {
    section: string;
    suggestion: string;
    impact: "high" | "medium" | "low";
    existingContent?: string;
    enhancedContent?: string;
}

export interface ScoreBreakdown {
    skills: number;
    experience: number;
    education: number;
    overall: number;
}

export interface AnalysisResult {
    score: number;
    scoreBreakdown: ScoreBreakdown | null;
    missingKeywords: MissingKeyword[];
    suggestions: Suggestion[];
    structuredResume?: ResumeSchema;
    latexCode?: string;
}

/* ------------------------------------------------------------------ */
/*  Structured Resume Schema  (Dynamic Sections)                       */
/* ------------------------------------------------------------------ */
export interface ResumePersonalInfo {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    website?: string;
}

/* ── Content types used inside sections ───────────────────────────── */

export interface ExperienceEntry {
    company: string;
    position: string;
    location: string;
    duration: string;
    bullets: string[];
}

export interface EducationEntry {
    school: string;
    degree: string;
    location: string;
    duration: string;
    details?: string;
}

export interface SkillGroupEntry {
    category: string;
    items: string[];
}

export interface ProjectEntry {
    name: string;
    description: string;
    highlights: string[];
    link?: string;
}

/* ── Section discriminated union ──────────────────────────────────── */

interface SectionBase {
    id: string;       // unique camelCase key, e.g. "workExperience"
    title: string;    // human-readable heading, e.g. "Work Experience"
}

export interface ExperienceSection extends SectionBase {
    type: "experience";
    content: ExperienceEntry[];
}

export interface EducationSection extends SectionBase {
    type: "education";
    content: EducationEntry[];
}

export interface SkillsSection extends SectionBase {
    type: "skills";
    content: SkillGroupEntry[];
}

export interface ProjectsSection extends SectionBase {
    type: "projects";
    content: ProjectEntry[];
}

export interface ListSection extends SectionBase {
    type: "list";
    content: string[];   // plain list of items
}

export interface TextSection extends SectionBase {
    type: "text";
    content: string;     // paragraph or multi-line text
}

export type ResumeSection =
    | ExperienceSection
    | EducationSection
    | SkillsSection
    | ProjectsSection
    | ListSection
    | TextSection;

/* ── Top-level schema ─────────────────────────────────────────────── */

export interface ResumeSchema {
    personalInfo: ResumePersonalInfo;
    sections: ResumeSection[];
}

export interface TextBlock {
    x: number;
    y: number;
    w: number;
    h: number;
    text: string;
    fontSize: number;
}

export interface PageData {
    pageIndex: number;
    width: number;
    height: number;
    textBlocks: TextBlock[];
}
