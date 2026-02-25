"use client";

import React from "react";
import { ScoreBreakdown } from "@/types";
import { scoreColor } from "@/lib/colors";

interface ScoreBreakdownGridProps {
    breakdown: ScoreBreakdown;
}

export function ScoreBreakdownGrid({ breakdown }: ScoreBreakdownGridProps) {
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(breakdown).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-border/30 bg-background/30 p-3 text-center">
                    <p className="text-xs font-medium capitalize text-muted-foreground">{key}</p>
                    <p className={`mt-1 text-2xl font-bold tabular-nums ${scoreColor(value)}`}>{value}%</p>
                </div>
            ))}
        </div>
    );
}
