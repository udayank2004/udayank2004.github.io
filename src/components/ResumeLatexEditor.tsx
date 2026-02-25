"use client";

import React, { useState, useCallback, useEffect } from "react";

interface ResumeLatexEditorProps {
    data: string;
    onChange: (data: string) => void;
}

export function ResumeLatexEditor({ data, onChange }: ResumeLatexEditorProps) {
    const [raw, setRaw] = useState(data);

    // Sync if external data changes (e.g., initial load)
    useEffect(() => {
        setRaw(data);
    }, [data]);

    const handleChange = useCallback(
        (value: string) => {
            setRaw(value);
            onChange(value);
        },
        [onChange]
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border/20 px-4 py-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                        LaTeX Source Editor
                    </span>
                    <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                        .tex
                    </span>
                </div>
                <span className="text-[10px] text-muted-foreground/60">
                    Live compile on edit
                </span>
            </div>
            <textarea
                className="flex-1 resize-none bg-[#0d0d1a] p-4 font-mono text-xs leading-relaxed text-indigo-300 outline-none placeholder:text-muted-foreground/30 selection:bg-indigo-500/30"
                value={raw}
                onChange={(e) => handleChange(e.target.value)}
                spellCheck={false}
                placeholder="% Your LaTeX code here..."
            />
        </div>
    );
}
