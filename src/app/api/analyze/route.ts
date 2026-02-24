import { NextResponse } from "next/server";
import Groq from "groq-sdk";

/* ------------------------------------------------------------------ */
/*  Groq client                                                        */
/* ------------------------------------------------------------------ */
const apiKey = process.env.GROQ_API_KEY;

function getClient() {
  if (!apiKey) throw new Error("GROQ_API_KEY is not set in .env.local");
  return new Groq({ apiKey });
}

/* ------------------------------------------------------------------ */
/*  POST /api/analyze                                                  */
/* ------------------------------------------------------------------ */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobDescription, resume } = body as {
      jobDescription?: string;
      resume?: string;
    };

    // Validate inputs
    if (
      !jobDescription ||
      !resume ||
      typeof jobDescription !== "string" ||
      typeof resume !== "string" ||
      !jobDescription.trim() ||
      !resume.trim()
    ) {
      return NextResponse.json(
        { error: "Both jobDescription and resume are required." },
        { status: 400 }
      );
    }

    // Build the prompt
    const prompt = `You are an expert resume optimizer and ATS (Applicant Tracking System) specialist.

Analyze the following resume against the given job description. Evaluate how well the resume matches the job requirements.

Return ONLY valid JSON (no markdown, no code fences, no extra text) in this exact format:
{
  "score": <number from 0 to 100 representing match percentage>,
  "missingKeywords": ["keyword1", "keyword2", ...],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", ...]
}

Rules:
- The score should reflect how well the resume matches the job description (skills, experience, qualifications).
- missingKeywords should list important skills, technologies, certifications, or qualifications mentioned in the job description but absent from the resume. List 3-8 keywords.
- suggestions should be specific, actionable improvements the candidate can make to their resume to better match this job. List 3-6 suggestions.
- Be honest and constructive. Do not inflate the score.

---

JOB DESCRIPTION:
${jobDescription}

---

RESUME:
${resume}`;

    // Call Groq
    const client = getClient();
    const chatCompletion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an expert resume optimizer and ATS specialist. Always respond with valid JSON only — no markdown, no code fences, no extra text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const text = chatCompletion.choices[0]?.message?.content ?? "";

    // Parse the JSON response
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (
      typeof parsed.score !== "number" ||
      !Array.isArray(parsed.missingKeywords) ||
      !Array.isArray(parsed.suggestions)
    ) {
      throw new Error("Unexpected response structure from AI model");
    }

    return NextResponse.json({
      score: Math.round(parsed.score),
      missingKeywords: parsed.missingKeywords,
      suggestions: parsed.suggestions,
    });
  } catch (err: unknown) {
    console.error("Analyze API error:", err);

    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    // Differentiate missing key from other errors
    if (message.includes("GROQ_API_KEY")) {
      return NextResponse.json(
        { error: "Server configuration error: Groq API key is not set." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
