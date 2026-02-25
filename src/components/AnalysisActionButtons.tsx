"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface AnalysisActionButtonsProps {
    onAnalyze: () => void;
    onReset: () => void;
    isLoading: boolean;
    disableAnalyze: boolean;
    disableReset: boolean;
}

export function AnalysisActionButtons({
    onAnalyze,
    onReset,
    isLoading,
    disableAnalyze,
    disableReset,
}: AnalysisActionButtonsProps) {
    return (
        <div className="mx-auto mb-10 flex max-w-5xl items-center justify-center gap-4">
            <Button
                size="lg"
                disabled={isLoading || disableAnalyze}
                onClick={onAnalyze}
                className="cursor-pointer bg-gradient-to-r from-blue-600 to-violet-600 px-10 py-6 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:from-blue-500 hover:to-violet-500 hover:shadow-xl hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isLoading ? (
                    <>
                        <svg
                            className="mr-2 h-4 w-4 animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                        </svg>
                        Analyzing…
                    </>
                ) : (
                    "Analyze & Optimize"
                )}
            </Button>
            <Button
                size="lg"
                variant="outline"
                disabled={disableReset}
                onClick={onReset}
                className="cursor-pointer border-red-500/30 px-8 py-6 text-base font-semibold text-red-400 transition-all hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
                Reset
            </Button>
        </div>
    );
}
