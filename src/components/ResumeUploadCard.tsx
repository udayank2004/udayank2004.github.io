"use client";

import React, { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ResumeUploadCardProps {
    resumeFileName: string | null;
    hasResume: boolean;
    isUploading: boolean;
    onUpload: (file: File) => void;
    onShowExtractedData: () => void;
}

export function ResumeUploadCard({
    resumeFileName,
    hasResume,
    isUploading,
    onUpload,
    onShowExtractedData,
}: ResumeUploadCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-lg">
                    <Label className="text-base font-semibold">
                        Upload Your Resume
                    </Label>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex h-[300px] flex-col items-center justify-center space-y-4">
                {resumeFileName && hasResume ? (
                    <div
                        className="flex cursor-pointer flex-col items-center gap-2 text-center transition-opacity hover:opacity-80"
                        onClick={() => fileInputRef.current?.click()}
                        title="Click to replace resume"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                            <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-emerald-400">File uploaded successfully</p>
                        <p className="text-xs text-muted-foreground">{resumeFileName}</p>
                        <p className="text-xs text-violet-400">Click to replace</p>
                    </div>
                ) : isUploading ? (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <svg className="h-8 w-8 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-sm text-muted-foreground">Extracting text…</p>
                    </div>
                ) : (
                    <div
                        className="flex cursor-pointer flex-col items-center gap-2 text-center transition-opacity hover:opacity-80"
                        onClick={() => fileInputRef.current?.click()}
                        title="Click to upload resume"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10 transition-transform hover:scale-110">
                            <svg className="h-7 w-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <p className="text-sm text-muted-foreground">Click to upload a PDF, DOCX, or TXT file</p>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUpload(f);
                        e.target.value = "";
                    }}
                />

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasResume}
                    onClick={onShowExtractedData}
                    className="cursor-pointer text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                    👁 Show extracted data
                </Button>
            </CardContent>
        </Card>
    );
}
