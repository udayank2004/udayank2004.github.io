"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Suggestion } from "@/types";

interface ActionableSuggestionsProps {
    suggestions: Suggestion[];
    onSuggestionClick: (suggestion: Suggestion) => void;
}

export function ActionableSuggestions({
    suggestions,
    onSuggestionClick,
}: ActionableSuggestionsProps) {
    const impactColors = {
        high: "bg-red-500/10 text-red-400",
        medium: "bg-amber-500/10 text-amber-400",
        low: "bg-blue-500/10 text-blue-400",
    };

    return (
        <ul className="space-y-2">
            {suggestions.map((s, i) => (
                <li
                    key={i}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/30 bg-background/20 p-3 text-sm transition-all hover:border-violet-500/40 hover:bg-violet-500/5"
                    onClick={() => onSuggestionClick(s)}
                >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                        {i + 1}
                    </span>
                    <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/40">
                                {s.section}
                            </Badge>
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium ${impactColors[s.impact]}`}>
                                {s.impact} impact
                            </span>
                        </div>
                        <span className="leading-relaxed text-muted-foreground">
                            {s.suggestion}
                        </span>
                    </div>
                    <svg className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </li>
            ))}
        </ul>
    );
}
