"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { scoreColor, progressColor } from "@/lib/colors";

interface MatchScoreDisplayProps {
    score: number;
}

export function MatchScoreDisplay({ score }: MatchScoreDisplayProps) {
    return (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <div className="text-center sm:text-left">
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                    Match Score
                </p>
                <span
                    className={`text-6xl font-black tabular-nums ${scoreColor(score)}`}
                >
                    {score}%
                </span>
            </div>
            <div className="w-full flex-1">
                <Progress
                    value={score}
                    className={`h-3 ${progressColor(score)}`}
                />
            </div>
        </div>
    );
}
