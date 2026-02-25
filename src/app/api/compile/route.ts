import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { latex } = await request.json();

        if (!latex) {
            return NextResponse.json({ error: "LaTeX code is required" }, { status: 400 });
        }

        // Call YtoTech LaTeX-on-HTTP API
        // Documentation: https://github.com/YtoTech/latex-on-http
        const response = await fetch("https://latex.ytotech.com/builds/sync", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                compiler: "pdflatex",
                resources: [
                    {
                        content: latex,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: "LaTeX compilation failed", detail: errorText },
                { status: response.status }
            );
        }

        // Return the PDF blob
        const pdfBuffer = await response.arrayBuffer();
        return new Response(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
            },
        });
    } catch (err) {
        console.error("Compile API error:", err);
        return NextResponse.json(
            { error: "An unexpected error occurred during compilation." },
            { status: 500 }
        );
    }
}
