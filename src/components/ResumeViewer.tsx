"use client";

import { useState, useMemo } from "react";
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
    text: string;
    fontSize: number;
}

interface PageData {
    pageIndex: number;
    width: number;
    height: number;
    textBlocks: TextBlock[];
}

interface Section {
    name: string;
    yStart: number;
    yEnd: number;
    xStart: number;
    xEnd: number;
    pageIndex: number;
}

interface ResumeViewerProps {
    fileUrl: string;
    pages: PageData[];
    highlightSection: string | null;
}

/* ------------------------------------------------------------------ */
/*  Section detection                                                  */
/* ------------------------------------------------------------------ */
const SECTION_KEYWORDS = [
    "education",
    "experience",
    "skills",
    "projects",
    "certifications",
    "summary",
    "objective",
    "achievements",
    "general",
];

/**
 * Detects section headings by checking individual text blocks
 * (not merged lines) against keywords, then computes tight
 * x/y bounding boxes using only the text blocks that fall
 * within the heading's horizontal column.
 */
function detectSections(pages: PageData[]): Section[] {
    const sections: Section[] = [];
    const COLUMN_TOLERANCE = 2; // form-unit tolerance for "same column"

    for (const page of pages) {
        // Step 1: Find heading blocks — individual text blocks whose
        //         content matches a section keyword.
        interface HeadingHit {
            name: string;
            block: TextBlock;
        }
        const headings: HeadingHit[] = [];

        for (const block of page.textBlocks) {
            const txt = block.text.trim().toLowerCase();
            if (txt.length > 40) continue; // headings are short
            for (const keyword of SECTION_KEYWORDS) {
                if (txt.includes(keyword)) {
                    headings.push({ name: keyword, block });
                    break;
                }
            }
        }

        // Sort headings top-to-bottom, left-to-right
        headings.sort((a, b) => a.block.y - b.block.y || a.block.x - b.block.x);

        // Step 2: For each heading, determine the vertical extent
        //         (yEnd) and horizontal bounds by scanning all text
        //         blocks that belong to the same column.
        for (let i = 0; i < headings.length; i++) {
            const h = headings[i];
            const hX = h.block.x;
            const hW = h.block.w || 5; // fallback width

            // Find yEnd: the y of the next heading that overlaps
            // this heading's x-range, OR page bottom.
            let yEnd = page.height;
            for (let j = i + 1; j < headings.length; j++) {
                const other = headings[j];
                // Check if "other" is in the same column
                const overlapX =
                    other.block.x < hX + hW + COLUMN_TOLERANCE &&
                    other.block.x + (other.block.w || 5) > hX - COLUMN_TOLERANCE;
                if (overlapX && other.block.y > h.block.y + 0.5) {
                    yEnd = other.block.y;
                    break;
                }
            }

            // Collect all text blocks within the y-range AND
            // overlapping the heading's x column.
            let xMin = hX;
            let xMax = hX + hW;
            for (const block of page.textBlocks) {
                if (block.y < h.block.y - 0.5 || block.y >= yEnd) continue;
                const bRight = block.x + (block.w || 1);
                // Is this block in the same column?
                if (
                    block.x < hX + hW + COLUMN_TOLERANCE * 3 &&
                    bRight > hX - COLUMN_TOLERANCE * 3
                ) {
                    xMin = Math.min(xMin, block.x);
                    xMax = Math.max(xMax, bRight);
                }
            }

            // Add padding
            const PAD = 0.5;
            sections.push({
                name: h.name,
                yStart: h.block.y - PAD,
                yEnd: yEnd,
                xStart: Math.max(0, xMin - PAD),
                xEnd: Math.min(page.width, xMax + PAD),
                pageIndex: page.pageIndex,
            });
        }
    }

    return sections;
}

/* ------------------------------------------------------------------ */
/*  Highlight colors                                                   */
/* ------------------------------------------------------------------ */
const HIGHLIGHT_COLOR = "rgba(139, 92, 246, 0.15)"; // violet
const HIGHLIGHT_BORDER = "rgba(139, 92, 246, 0.6)";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ResumeViewer({
    fileUrl,
    pages,
    highlightSection,
}: ResumeViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageWidth, setPageWidth] = useState(600);

    const sections = useMemo(() => detectSections(pages), [pages]);

    // Find the section(s) matching the highlight
    const activeHighlights = useMemo(() => {
        if (!highlightSection) return [];
        const normalized = highlightSection.toLowerCase();
        return sections.filter((s) => s.name === normalized);
    }, [sections, highlightSection]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    // Convert pdf2json "form units" to pixel position on the rendered page
    function toPixelY(formY: number, pageData: PageData): number {
        return (formY / pageData.height) * pageWidth * (pageData.height / pageData.width);
    }

    function toPixelX(formX: number, pageData: PageData): number {
        return (formX / pageData.width) * pageWidth;
    }

    function getRenderedPageHeight(pageData: PageData): number {
        return pageWidth * (pageData.height / pageData.width);
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {highlightSection ? (
                    <span className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-sm border border-violet-500/60 bg-violet-500/20" />
                        Highlighting: <strong className="text-violet-400 capitalize">{highlightSection}</strong>
                    </span>
                ) : (
                    <span>Click a suggestion to highlight its section on the resume</span>
                )}
            </div>

            <div
                className="relative overflow-auto rounded-lg border border-border/40 bg-white shadow-lg"
                style={{ maxHeight: "70vh" }}
            >
                <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex h-[400px] w-[600px] items-center justify-center">
                            <svg className="h-8 w-8 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    }
                >
                    {Array.from({ length: numPages }, (_, i) => {
                        const pageData = pages[i];
                        const renderedH = pageData ? getRenderedPageHeight(pageData) : 0;

                        // Find highlights for this page
                        const pageHighlights = activeHighlights.filter(
                            (h) => h.pageIndex === i
                        );

                        return (
                            <div key={i} className="relative" style={{ marginBottom: 8 }}>
                                <Page
                                    pageNumber={i + 1}
                                    width={pageWidth}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />

                                {/* Overlay layer for highlights */}
                                {pageData && pageHighlights.length > 0 && (
                                    <div
                                        className="pointer-events-none absolute inset-0"
                                        style={{ width: pageWidth, height: renderedH }}
                                    >
                                        {pageHighlights.map((hl, idx) => {
                                            const top = toPixelY(hl.yStart, pageData);
                                            const bottom = toPixelY(hl.yEnd, pageData);
                                            const height = bottom - top;
                                            const left = toPixelX(hl.xStart, pageData);
                                            const width = toPixelX(hl.xEnd, pageData) - left;

                                            return (
                                                <div
                                                    key={idx}
                                                    className="absolute transition-all duration-300 animate-pulse"
                                                    style={{
                                                        top,
                                                        left,
                                                        width,
                                                        height,
                                                        backgroundColor: "rgba(139, 92, 246, 0.25)",
                                                        border: "3px solid rgba(139, 92, 246, 0.8)",
                                                        borderRadius: 6,
                                                        boxShadow: "0 0 12px rgba(139, 92, 246, 0.4)",
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

            {numPages > 0 && (
                <div className="flex items-center gap-4">
                    <label className="text-xs text-muted-foreground">Zoom:</label>
                    <input
                        type="range"
                        min={300}
                        max={900}
                        step={50}
                        value={pageWidth}
                        onChange={(e) => setPageWidth(Number(e.target.value))}
                        className="w-32 accent-violet-500"
                    />
                    <span className="text-xs tabular-nums text-muted-foreground">
                        {Math.round((pageWidth / 600) * 100)}%
                    </span>
                </div>
            )}
        </div>
    );
}
