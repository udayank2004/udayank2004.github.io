"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { Suggestion, PageData } from "@/types";

const ResumeViewer = dynamic(() => import("@/components/ResumeViewer"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Loading PDF viewer…
        </div>
    ),
});

interface OptimizationWorkspaceProps {
    selectedSuggestion: Suggestion | null;
    resumeFileUrl: string | null;
    resumePages: PageData[] | null;
    onClose: () => void;
}

export function OptimizationWorkspace({
    selectedSuggestion,
    resumeFileUrl,
    resumePages,
    onClose,
}: OptimizationWorkspaceProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog
            open={!!selectedSuggestion}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="h-[95vh] w-[70vw] max-w-none overflow-hidden border-border/40 bg-[#0a0a0f] p-0">
                <DialogHeader className="border-b border-border/30 px-6 py-4">
                    <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
                        <span>Optimization Workspace</span>
                        {selectedSuggestion && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5 border-violet-500/40 text-violet-400">
                                {selectedSuggestion.section}
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100" />
                </DialogHeader>

                {selectedSuggestion && (
                    <div className="grid h-[calc(95vh-64px)] grid-cols-1 md:grid-cols-2">
                        {/* Left — PDF Viewer */}
                        <div className="h-full overflow-y-scroll border-r border-border/20 bg-white/5 p-4">
                            {resumeFileUrl && resumePages ? (
                                <ResumeViewer
                                    fileUrl={resumeFileUrl}
                                    pages={resumePages}
                                    highlightText={selectedSuggestion?.existingContent ?? null}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                    No PDF available for preview.
                                </div>
                            )}
                        </div>

                        {/* Right — Before / After */}
                        <div className="flex flex-col overflow-y-auto">
                            {/* Suggestion Description */}
                            <div className="border-b border-border/20 px-5 py-4">
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    {selectedSuggestion.suggestion}
                                </p>
                            </div>

                            {selectedSuggestion.existingContent && selectedSuggestion.enhancedContent ? (
                                <>
                                    {/* Current */}
                                    <div className="px-5 pt-4 pb-2">
                                        <div className="mb-3 flex items-center gap-2">
                                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
                                            <span className="text-sm font-semibold text-red-400">Current Content</span>
                                        </div>
                                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                                            <p className="text-sm leading-relaxed text-red-300/80">
                                                {selectedSuggestion.existingContent}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Enhanced */}
                                    <div className="px-5 pt-2 pb-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                                <span className="text-sm font-semibold text-emerald-400">Enhanced Content</span>
                                            </div>
                                            <button
                                                type="button"
                                                className={`rounded-md px-3 py-1 text-xs font-medium ring-1 transition-colors ${copied
                                                    ? "bg-emerald-500/20 text-emerald-300 ring-emerald-400/50"
                                                    : "text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/10"
                                                    }`}
                                                onClick={() => handleCopy(selectedSuggestion.enhancedContent!)}
                                            >
                                                {copied ? "✓ Copied!" : "📋 Copy"}
                                            </button>
                                        </div>
                                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                                            <p className="text-sm leading-relaxed text-emerald-300/80">
                                                {selectedSuggestion.enhancedContent}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-1 items-center justify-center p-6">
                                    <p className="text-sm text-muted-foreground italic">
                                        No before/after content available for this suggestion.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
