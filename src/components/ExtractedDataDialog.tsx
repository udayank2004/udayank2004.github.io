"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";

interface ExtractedDataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    resume: string;
    resumeFileName: string | null;
}

export function ExtractedDataDialog({
    isOpen,
    onClose,
    resume,
    resumeFileName,
}: ExtractedDataDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden border-border/40 bg-[#0f0f1a]">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        Extracted Resume Data
                        {resumeFileName && (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                — {resumeFileName}
                            </span>
                        )}
                    </DialogTitle>
                    <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100" />
                </DialogHeader>
                <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-lg bg-background/50 p-4">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {resume || "No data extracted yet."}
                    </pre>
                </div>
            </DialogContent>
        </Dialog>
    );
}
