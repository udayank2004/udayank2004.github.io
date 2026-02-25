"use client";

import React, { useState, useCallback } from "react";
import type { ResumeSchema } from "@/types";

interface ResumeJsonEditorProps {
    data: ResumeSchema;
    onChange: (data: ResumeSchema) => void;
}

export function ResumeJsonEditor({ data, onChange }: ResumeJsonEditorProps) {
    const [raw, setRaw] = useState(() => JSON.stringify(data, null, 2));
    const [parseError, setParseError] = useState<string | null>(null);

    const handleChange = useCallback(
        (value: string) => {
            setRaw(value);
            try {
                const parsed = JSON.parse(value) as ResumeSchema;
                setParseError(null);
                onChange(parsed);
            } catch {
                setParseError("Invalid JSON — fix syntax to update preview");
            }
        },
        [onChange]
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border/20 px-4 py-2">
                <span className="text-xs font-semibold text-muted-foreground">
                    Resume JSON Editor
                </span>
                {parseError ? (
                    <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                        {parseError}
                    </span>
                ) : (
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        ✓ Valid JSON
                    </span>
                )}
            </div>
            <textarea
                className="flex-1 resize-none bg-[#0d0d1a] p-4 font-mono text-xs leading-relaxed text-violet-300 outline-none placeholder:text-muted-foreground/30 selection:bg-violet-500/30"
                value={raw}
                onChange={(e) => handleChange(e.target.value)}
                spellCheck={false}
            />
        </div>
    );
}
