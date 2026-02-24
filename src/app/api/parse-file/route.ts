import { NextResponse } from "next/server";

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

        /* ----- PDF ------------------------------------------------- */
        if (name.endsWith(".pdf")) {
            try {
                // Import the actual parser directly, bypassing pdf-parse's
                // index.js which has a debug-mode bug that tries to read a
                // non-existent test file (05-versions-space.pdf).
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const pdfParse = require("pdf-parse/lib/pdf-parse");
                const data = await pdfParse(buffer);
                text = data.text;
            } catch (pdfErr: unknown) {
                const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
                log("error", "pdf-parse failed", { filename: file.name, error: msg });

                // Detect password-protected PDFs
                if (msg.toLowerCase().includes("password")) {
                    return NextResponse.json(
                        { error: "This PDF appears to be password-protected. Please remove the password and try again." },
                        { status: 422 }
                    );
                }
                // Detect encrypted / DRM PDFs
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

        return NextResponse.json({ text: trimmed });
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

