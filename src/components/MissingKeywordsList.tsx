"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { MissingKeyword } from "@/types";

interface MissingKeywordsListProps {
    keywords: MissingKeyword[];
}

export function MissingKeywordsList({ keywords }: MissingKeywordsListProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {keywords.map((kw, i) => {
                const colors = {
                    high: "border-red-500/40 bg-red-500/10 text-red-300",
                    medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
                    low: "border-violet-500/30 bg-violet-500/10 text-violet-300",
                };
                return (
                    <Badge
                        key={i}
                        variant="secondary"
                        className={`border ${colors[kw.priority]} cursor-default`}
                        title={kw.context}
                    >
                        {kw.keyword}
                        <span className="ml-1.5 text-[10px] opacity-60">({kw.priority})</span>
                    </Badge>
                );
            })}
        </div>
    );
}
