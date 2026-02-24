import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/* ------------------------------------------------------------------ */
/*  POST /api/parse-file                                               */
/*  Accepts a multipart form upload with a field named "file".         */
/*  Supports: .pdf, .docx, .txt                                       */
/*  Returns: { text: string }                                         */
/* ------------------------------------------------------------------ */

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/** Structured logger for parse-file operations */
function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
    const entry = {
        timestamp: new Date().toISOString(),
        service: "parse-file",
        level,
        message,
        ...meta,
    };
    if (level === "error") console.error(JSON.stringify(entry));
    else if (level === "warn") console.warn(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file || !(file instanceof File)) {
            log("warn", "Request received with no file attached.");
            return NextResponse.json(
                { error: "No file provided." },
                { status: 400 }
            );
        }

        const name = file.name.toLowerCase();
        const sizeKB = (file.size / 1024).toFixed(1);

        log("info", "Extraction started", { filename: file.name, sizeKB, type: file.type });

        if (file.size > MAX_SIZE) {
            log("warn", "File exceeds size limit", { filename: file.name, sizeKB });
            return NextResponse.json(
                { error: `File too large (${sizeKB} KB). Maximum size is 10 MB.` },
                { status: 400 }
            );
        }

        if (file.size === 0) {
            log("warn", "Empty file uploaded", { filename: file.name });
            return NextResponse.json(
                { error: "The uploaded file is empty (0 bytes)." },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let text = "";

        /* ----- PDF (pdf2json — with spatial data) -------------------- */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let pdfPages: any[] | null = null;

        if (name.endsWith(".pdf")) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const PDFParser = require("pdf2json");

                const pdfData = await new Promise<{
                    text: string; pages: Array<{
                        pageIndex: number;
                        width: number;
                        height: number;
                        textBlocks: Array<{ x: number; y: number; w: number; text: string; fontSize: number }>;
                    }>
                }>((resolve, reject) => {
                    const pdfParser = new PDFParser(null, true); // null = no owner password, true = raw text mode

                    pdfParser.on("pdfParser_dataReady", (data: {
                        Pages: Array<{
                            Width: number;
                            Height: number;
                            Texts: Array<{
                                x: number;
                                y: number;
                                w: number;
                                sw: number;
                                clr: number;
                                R: Array<{ T: string; TS: number[] }>;
                            }>;
                        }>;
                    }) => {
                        const pages = data.Pages.map((page, idx) => {
                            const textBlocks = page.Texts.map((t) => {
                                const decoded = t.R.map((r) => decodeURIComponent(r.T)).join("");
                                const fontSize = t.R[0]?.TS?.[1] ?? 12;
                                return {
                                    x: t.x,
                                    y: t.y,
                                    w: t.w,
                                    text: decoded,
                                    fontSize,
                                };
                            });
                            return {
                                pageIndex: idx,
                                width: page.Width,
                                height: page.Height,
                                textBlocks,
                            };
                        });

                        // Build flat text from all pages
                        const flatText = pages
                            .map((p) => p.textBlocks.map((b: { text: string }) => b.text).join(" "))
                            .join("\n");

                        resolve({ text: flatText, pages });
                    });

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pdfParser.on("pdfParser_dataError", (err: any) => {
                        reject(new Error(err?.parserError?.message || String(err)));
                    });

                    pdfParser.parseBuffer(buffer);
                });

                text = pdfData.text;
                pdfPages = pdfData.pages;
            } catch (pdfErr: unknown) {
                const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
                log("error", "pdf2json failed", { filename: file.name, error: msg });

                if (msg.toLowerCase().includes("password")) {
                    return NextResponse.json(
                        { error: "This PDF appears to be password-protected. Please remove the password and try again." },
                        { status: 422 }
                    );
                }
                if (msg.toLowerCase().includes("encrypt")) {
                    return NextResponse.json(
                        { error: "This PDF is encrypted and cannot be read. Please provide an unencrypted version." },
                        { status: 422 }
                    );
                }
                return NextResponse.json(
                    { error: `Failed to parse PDF: ${msg}` },
                    { status: 500 }
                );
            }

            /* ----- DOCX ------------------------------------------------ */
        } else if (name.endsWith(".docx")) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const mammoth = require("mammoth");
                const result = await mammoth.extractRawText({ buffer });
                text = result.value;

                // Log mammoth warnings (e.g. unsupported features)
                if (result.messages?.length) {
                    log("warn", "mammoth emitted warnings", {
                        filename: file.name,
                        warnings: result.messages.map((m: { message: string }) => m.message),
                    });
                }
            } catch (docxErr: unknown) {
                const msg = docxErr instanceof Error ? docxErr.message : String(docxErr);
                log("error", "mammoth extraction failed", { filename: file.name, error: msg });
                return NextResponse.json(
                    { error: `Failed to parse DOCX: ${msg}` },
                    { status: 500 }
                );
            }

            /* ----- DOC (legacy, unsupported) ---------------------------- */
        } else if (name.endsWith(".doc")) {
            log("warn", "Legacy .doc file uploaded — not supported by mammoth", { filename: file.name });
            return NextResponse.json(
                { error: "Old Word (.doc) format is not supported. Please re-save the file as .docx or .pdf and try again." },
                { status: 415 }
            );

            /* ----- TXT ------------------------------------------------- */
        } else if (name.endsWith(".txt")) {
            text = buffer.toString("utf-8");

            /* ----- Unsupported ----------------------------------------- */
        } else {
            const ext = name.includes(".") ? name.split(".").pop() : "unknown";
            log("warn", "Unsupported file type", { filename: file.name, extension: ext });
            return NextResponse.json(
                { error: `Unsupported file type (.${ext}). Please upload a PDF, DOCX, or TXT file.` },
                { status: 400 }
            );
        }

        const trimmed = text.trim();

        if (!trimmed) {
            log("warn", "Extraction returned empty text", { filename: file.name });
            return NextResponse.json(
                {
                    error:
                        "Could not extract any text from the file. " +
                        "This usually means the document is a scanned image or contains only graphics. " +
                        "Try copy-pasting the text manually instead.",
                },
                { status: 422 }
            );
        }

        log("info", "Extraction completed", {
            filename: file.name,
            extractedChars: trimmed.length,
        });

        const response: Record<string, unknown> = { text: trimmed };
        if (pdfPages) response.pages = pdfPages;

        // Save extracted data to a JSON file
        try {
            const outputDir = path.join(process.cwd(), "public", "extracted");
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const baseName = file.name.replace(/\.[^.]+$/, "");
            const outputPath = path.join(outputDir, `${baseName}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(response, null, 2), "utf-8");
            log("info", "Extracted data saved to file", { path: outputPath });
        } catch (saveErr) {
            log("warn", "Failed to save extracted data to file", {
                error: saveErr instanceof Error ? saveErr.message : String(saveErr),
            });
        }

        return NextResponse.json(response);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        log("error", "Unhandled parse-file error", { error: msg, stack });
        return NextResponse.json(
            { error: "An unexpected error occurred while parsing the file. Please try again." },
            { status: 500 }
        );
    }
}

