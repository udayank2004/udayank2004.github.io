"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ResumeLatexEditor } from "@/components/ResumeLatexEditor";
import { TemplateSelector } from "@/components/TemplateSelector";
import { useDebounce } from "use-debounce";

interface ResumeVisualizerWorkspaceProps {
    initialLatex: string;
    onBack: () => void;
}

export function ResumeVisualizerWorkspace({
    initialLatex,
    onBack,
}: ResumeVisualizerWorkspaceProps) {
    const [latexCode, setLatexCode] = useState(initialLatex);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const [compileError, setCompileError] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState("classic-latex");

    // Debounce the LaTeX source to avoid over-calling the API
    const [debouncedLatex] = useDebounce(latexCode, 1500);

    // Compile LaTeX to PDF
    useEffect(() => {
        if (!debouncedLatex) return;

        let active = true;
        const compile = async () => {
            setIsCompiling(true);
            setCompileError(null);
            try {
                const res = await fetch("/api/compile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ latex: debouncedLatex }),
                });

                if (!res.ok) throw new Error("Compilation failed");

                const blob = await res.blob();
                if (active) {
                    const url = URL.createObjectURL(blob);
                    // Revoke old URL to prevent memory leaks
                    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
                    setPdfUrl(url);
                }
            } catch (err) {
                if (active) setCompileError("LaTeX compilation failed. Check your syntax.");
            } finally {
                if (active) setIsCompiling(false);
            }
        };

        compile();
        return () => { active = false; };
    }, [debouncedLatex]);

    const handleDownload = useCallback(() => {
        if (!pdfUrl) return;
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = "Resume.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [pdfUrl]);

    return (
        <div className="flex h-screen flex-col bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]">
            {/* ── Top Bar ──────────────────────────── */}
            <div className="flex items-center justify-between border-b border-border/30 px-6 py-3">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 rounded-lg border border-border/30 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-violet-500/40 hover:text-violet-400"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Analysis
                    </button>
                    <h2 className="text-lg font-semibold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                        Professional LaTeX Builder
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        disabled={!pdfUrl || isCompiling}
                        onClick={handleDownload}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-50"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                    </button>
                </div>
            </div>

            {/* ── Template Selector ──────────────── */}
            <TemplateSelector
                selectedTemplate={selectedTemplate}
                onSelect={setSelectedTemplate}
            />

            {/* ── Main Workspace (Split View) ────── */}
            <div className="flex flex-1 overflow-hidden border-t border-border/30">
                {/* Left — LaTeX Editor */}
                <div className="flex w-1/2 flex-col border-r border-border/20">
                    <ResumeLatexEditor data={latexCode} onChange={setLatexCode} />
                </div>

                {/* Right — PDF Preview */}
                <div className="flex w-1/2 flex-col bg-[#1e1e2d]">
                    <div className="flex items-center justify-between border-b border-white/5 bg-[#0d0d1a] px-4 py-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                                PDF Performance Preview
                            </span>
                            {isCompiling && (
                                <div className="flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                                    <span className="text-[10px] text-indigo-400 animate-pulse">Compiling LaTeX…</span>
                                </div>
                            )}
                        </div>
                        {compileError ? (
                            <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                                {compileError}
                            </span>
                        ) : (
                            <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
                                Exact Template Match
                            </span>
                        )}
                    </div>
                    <div className="flex-1 bg-white/5">
                        {pdfUrl ? (
                            <iframe
                                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                className="h-full w-full"
                                style={{ border: "none" }}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center flex-col gap-3">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                                <span className="text-sm text-muted-foreground">Generating initial preview…</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
