"use client";

import React from "react";

interface TemplateSelectorProps {
    selectedTemplate: string;
    onSelect: (templateId: string) => void;
}

const TEMPLATES = [
    {
        id: "modern-1",
        name: "Modern Professional",
        description: "Clean, ATS-friendly layout with violet accents",
        preview: "🟪",
    },
];

export function TemplateSelector({ selectedTemplate, onSelect }: TemplateSelectorProps) {
    return (
        <div className="flex items-center gap-4 px-6 py-4">
            <span className="text-sm font-medium text-muted-foreground">Template:</span>
            <div className="flex gap-3">
                {TEMPLATES.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onSelect(t.id)}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all ${selectedTemplate === t.id
                                ? "border-violet-500 bg-violet-500/10 text-violet-300"
                                : "border-border/40 bg-background/20 text-muted-foreground hover:border-violet-500/40 hover:bg-violet-500/5"
                            }`}
                    >
                        <span className="text-lg">{t.preview}</span>
                        <div className="text-left">
                            <p className="font-medium">{t.name}</p>
                            <p className="text-[10px] opacity-60">{t.description}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
