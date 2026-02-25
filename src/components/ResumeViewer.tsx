"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface TextBlock {
    x: number;
    y: number;
    w: number;
    h: number;
    text: string;
    fontSize: number;
}

interface PageData {
    pageIndex: number;
    width: number;   // in PDF points (72pt = 1 inch)
    height: number;  // in PDF points
    textBlocks: TextBlock[];
}

interface HighlightRect {
    yStart: number;  // PDF points
    yEnd: number;
    xStart: number;
    xEnd: number;
    pageIndex: number;
}

interface ResumeViewerProps {
    fileUrl: string;
    pages: PageData[];
    highlightText: string | null;
}

/* ------------------------------------------------------------------ */
/*  Merge nearby text blocks on the same line into phrases             */
/* ------------------------------------------------------------------ */
interface MergedBlock {
    text: string;
    x: number;
    y: number;
    xEnd: number;
    yEnd: number;
    pageIndex: number;
}

function mergeBlocksForPage(
    blocks: TextBlock[],
    pageIndex: number
): MergedBlock[] {
    if (blocks.length === 0) return [];

    const Y_TOLERANCE = 2.5;  // Adjust for line height variations
    const X_GAP = 12;        // Points gap before we consider it a new word/phrase

    const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);

    const merged: MergedBlock[] = [];
    let cur: MergedBlock = {
        text: sorted[0].text,
        x: sorted[0].x,
        y: sorted[0].y,
        xEnd: sorted[0].x + sorted[0].w,
        yEnd: sorted[0].y + sorted[0].h,
        pageIndex,
    };

    for (let i = 1; i < sorted.length; i++) {
        const b = sorted[i];
        const sameLine = Math.abs(b.y - cur.y) < Y_TOLERANCE;
        const closeEnough = b.x - cur.xEnd < X_GAP;

        if (sameLine && closeEnough) {
            // Add space helper for non-contiguous characters
            if (b.x - cur.xEnd > 1.5) cur.text += " ";
            cur.text += b.text;
            cur.xEnd = Math.max(cur.xEnd, b.x + b.w);
            cur.yEnd = Math.max(cur.yEnd, b.y + b.h);
        } else {
            merged.push(cur);
            cur = {
                text: b.text,
                x: b.x,
                y: b.y,
                xEnd: b.x + b.w,
                yEnd: b.y + b.h,
                pageIndex,
            };
        }
    }
    merged.push(cur);
    return merged;
}

/* ------------------------------------------------------------------ */
/*  Normalize text for fuzzy comparison                                 */
/* ------------------------------------------------------------------ */
function normalize(s: string): string {
    return s
        .replace(/\s+/g, " ")
        .replace(/[^\w\s.,;:!?/()\-@]/g, "") // Added @ for emails
        .trim()
        .toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  Find highlight rectangles by matching existingContent text          */
/* ------------------------------------------------------------------ */
function findTextHighlights(
    pages: PageData[],
    searchText: string
): HighlightRect[] {
    if (!searchText || searchText.trim().length === 0) return [];

    const highlights: HighlightRect[] = [];
    const searchNorm = normalize(searchText);

    // Filter out very short or generic lines to avoid false positives
    const searchLines = searchText
        .split(/\n/)
        .map((l) => normalize(l))
        .filter((l) => l.length > 2);

    if (searchLines.length === 0 && searchNorm.length > 2) {
        searchLines.push(searchNorm);
    }

    for (const page of pages) {
        const mergedBlocks = mergeBlocksForPage(page.textBlocks, page.pageIndex);

        for (const searchLine of searchLines) {
            for (const mb of mergedBlocks) {
                const blockNorm = normalize(mb.text);

                // Check if this merged block contains the search line or vice versa
                if (
                    blockNorm.includes(searchLine) ||
                    searchLine.includes(blockNorm)
                ) {
                    const shorter = Math.min(blockNorm.length, searchLine.length);
                    const longer = Math.max(blockNorm.length, searchLine.length);

                    // Match quality check (> 40% intersection for headers, > 60% for long text)
                    const threshold = longer < 15 ? 0.4 : 0.6;

                    if (shorter / longer >= threshold) {
                        const PAD_Y = 1.0;
                        const PAD_X = 1.5;
                        highlights.push({
                            yStart: mb.y - PAD_Y,
                            yEnd: mb.yEnd + PAD_Y,
                            xStart: Math.max(0, mb.x - PAD_X),
                            xEnd: Math.min(page.width, mb.xEnd + PAD_X),
                            pageIndex: page.pageIndex,
                        });
                    }
                }
            }
        }
    }

    return mergeHighlightRects(highlights);
}

/* ------------------------------------------------------------------ */
/*  Merge overlapping/adjacent rects into fewer boxes                   */
/* ------------------------------------------------------------------ */
function mergeHighlightRects(rects: HighlightRect[]): HighlightRect[] {
    if (rects.length <= 1) return rects;

    const sorted = [...rects].sort(
        (a, b) => a.pageIndex - b.pageIndex || a.yStart - b.yStart
    );

    const merged: HighlightRect[] = [{ ...sorted[0] }];

    for (let i = 1; i < sorted.length; i++) {
        const prev = merged[merged.length - 1];
        const curr = sorted[i];

        // Merge if same page, vertically close, AND horizontally overlapping or near
        const samePage = curr.pageIndex === prev.pageIndex;
        const vertClose = curr.yStart <= prev.yEnd + 1.5; // Tighter vertical gap
        const horizOverlap = !(curr.xEnd < prev.xStart - 10 || curr.xStart > prev.xEnd + 10);

        if (samePage && vertClose && horizOverlap) {
            prev.yEnd = Math.max(prev.yEnd, curr.yEnd);
            prev.xStart = Math.min(prev.xStart, curr.xStart);
            prev.xEnd = Math.max(prev.xEnd, curr.xEnd);
        } else {
            merged.push({ ...curr });
        }
    }

    return merged;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ResumeViewer({
    fileUrl,
    pages,
    highlightText,
}: ResumeViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageWidth, setPageWidth] = useState(600);
    const containerRef = useRef<HTMLDivElement>(null);

    // Measure the container
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const w = Math.floor(entry.contentRect.width);
                if (w > 0) setPageWidth(w);
            }
        });
        observer.observe(containerRef.current);
        const currentW = Math.floor(containerRef.current.getBoundingClientRect().width);
        if (currentW > 0) setPageWidth(currentW);

        return () => observer.disconnect();
    }, []);

    // Find exact text matches
    const activeHighlights = useMemo(
        () => findTextHighlights(pages, highlightText ?? ""),
        [pages, highlightText]
    );

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    // PDF pts to Pixels scale
    function toPixel(pdfPt: number, pageData: PageData): number {
        return pdfPt * (pageWidth / pageData.width);
    }

    function getRenderedPageHeight(pageData: PageData): number {
        return pageData.height * (pageWidth / pageData.width);
    }

    return (
        <div ref={containerRef} className="flex w-full flex-col items-center gap-4">
            <style jsx global>{`
                .react-pdf__Page__canvas {
                    display: block !important;
                    margin: 0 auto !important;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                }
                .react-pdf__Page {
                    background-color: white !important;
                }
            `}</style>

            <div className="flex items-center gap-3 text-sm text-muted-foreground transition-opacity duration-300">
                {highlightText ? (
                    <span className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                        <span className="inline-block h-3 w-3 rounded-sm border border-violet-500/60 bg-violet-500/20" />
                        Highlighting matched content
                    </span>
                ) : (
                    <span className="opacity-70">Click a suggestion to highlight on the resume</span>
                )}
            </div>

            <div className="relative w-full overflow-hidden rounded-xl border border-border/40 bg-white shadow-2xl">
                <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex h-[400px] w-full items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
                        </div>
                    }
                >
                    {Array.from({ length: numPages }, (_, i) => {
                        const pageData = pages[i];
                        const renderedH = pageData
                            ? getRenderedPageHeight(pageData)
                            : 0;

                        const pageHighlights = activeHighlights.filter(
                            (h) => h.pageIndex === i
                        );

                        return (
                            <div
                                key={i}
                                className="relative flex justify-center bg-muted/5 last:mb-0"
                                style={{ marginBottom: 16 }}
                            >
                                <Page
                                    pageNumber={i + 1}
                                    width={pageWidth}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />

                                {pageData && pageHighlights.length > 0 && (
                                    <div
                                        className="pointer-events-none absolute"
                                        style={{
                                            top: 0,
                                            left: 0,
                                            width: pageWidth,
                                            height: renderedH,
                                        }}
                                    >
                                        {pageHighlights.map((hl, idx) => {
                                            const top = toPixel(hl.yStart, pageData);
                                            const height = toPixel(hl.yEnd - hl.yStart, pageData);
                                            const left = toPixel(hl.xStart, pageData);
                                            const width = toPixel(hl.xEnd - hl.xStart, pageData);

                                            return (
                                                <div
                                                    key={idx}
                                                    className="absolute transition-all duration-300 animate-pulse"
                                                    style={{
                                                        top,
                                                        left,
                                                        width,
                                                        height,
                                                        backgroundColor: "rgba(139, 92, 246, 0.22)",
                                                        border: "2px solid rgba(139, 92, 246, 0.7)",
                                                        borderRadius: 4,
                                                        boxShadow: "0 0 8px rgba(139, 92, 246, 0.3)",
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </Document>
            </div>
        </div>
    );
}
