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
