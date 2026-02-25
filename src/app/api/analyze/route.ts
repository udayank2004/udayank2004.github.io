import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

/* ------------------------------------------------------------------ */
/*  Groq client                                                        */
/* ------------------------------------------------------------------ */
const groqApiKey = process.env.GROQ_API_KEY;

function getClient() {
  if (!groqApiKey) throw new Error("GROQ_API_KEY is not set in .env.local");
  return new Groq({ apiKey: groqApiKey });
}

/* ------------------------------------------------------------------ */
/*  Redis client (optional — degrades gracefully if not configured)    */
/* ------------------------------------------------------------------ */
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function getRedis(): Redis | null {
  if (!redisUrl || !redisToken) return null;
  return new Redis({ url: redisUrl, token: redisToken });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Normalize text to ensure minor whitespace differences don't bust the cache */
function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Create a deterministic fingerprint from JD + Resume */
function createCacheKey(jd: string, resume: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(normalize(jd) + "||" + normalize(resume))
    .digest("hex");
  return `analyze:${hash}`;
}

function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), service: "analyze", level, message, ...meta };
  if (level === "error") console.error(JSON.stringify(entry));
  else if (level === "warn") console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
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

    // ── Cache lookup ──────────────────────────────────────────
    const redis = getRedis();
    const cacheKey = createCacheKey(jobDescription, resume);

    if (redis) {
      try {
        const cached = await redis.get<string>(cacheKey);
        if (cached) {
          log("info", "Cache HIT", { cacheKey });
          const data = typeof cached === "string" ? JSON.parse(cached) : cached;
          return NextResponse.json({ ...data, cached: true });
        }
        log("info", "Cache MISS", { cacheKey });
      } catch (redisErr) {
        log("warn", "Redis lookup failed — falling through to LLM", {
          error: redisErr instanceof Error ? redisErr.message : String(redisErr),
        });
      }
    }

    // ── Load & Split LaTeX Template ──────────────────────────
    let latexPreamble = "";
    let latexSkeleton = "";
    try {
      const fs = require("fs");
      const path = require("path");
      const templatePath = path.join(process.cwd(), "Plans", "reesume.tex");
      const fullTemplate = fs.readFileSync(templatePath, "utf-8");

      // Split by \begin{document}
      const parts = fullTemplate.split(/\\begin\{document\}/);
      if (parts.length === 2) {
        latexPreamble = parts[0] + "\\begin{document}\n";
        latexSkeleton = parts[1].replace(/\\end\{document\}/, "").trim();
      } else {
        latexPreamble = "";
        latexSkeleton = fullTemplate; // Fallback
      }
    } catch (err) {
      log("warn", "Could not load reesume.tex template", { error: err });
    }

    // ── Build the prompt ──────────────────────────────────────
    const prompt = `Analyze the following resume against the given job description.
    
Return ONLY valid JSON in this exact format:
{
  "score": <number 0-100>,
  "scoreBreakdown": {
    "skills": <number 0-100>,
    "experience": <number 0-100>,
    "education": <number 0-100>,
    "overall": <number 0-100>
  },
  "headersDetected": ["List ALL headings found in the original resume BEFORE generating content"],
  "missingKeywords": [
    { "keyword": "string", "priority": "high" | "medium" | "low", "context": "why this matters for the role" }
  ],
  "suggestions": [
    {
      "section": "string (name of the resume section)",
      "suggestion": "brief description of the improvement",
      "impact": "high" | "medium" | "low",
      "existingContent": "the exact sentence or bullet point from the resume that should be improved (copy verbatim from the resume text)",
      "enhancedContent": "the rewritten, optimized version incorporating missing keywords, power verbs, and quantified achievements"
    }
  ],
  "latexBody": "The LaTeX CONTENT ONLY (no preamble). Generate EVERYTHING that goes between \\begin{document} and \\end{document}. You must use the template structure but insure ZERO DATA LOSS."
}

RULES FOR CONTENT PRESERVATION (SACRED):
1. ROLE: You are a "Data Integrity Specialist". Your #1 priority is 100% data retention.
2. DISCOVERY: Explicitly list all sections from the original resume in "headersDetected".
3. NO TRUNCATION: Do NOT omit any section, any company, any project, or any bullet point. If it's in the original, it MUST be in the LaTeX.
4. DYNAMIC SECTIONS:
   - If a section in the original resume doesn't exist in the provided skeleton, CREATE it using the \\section macro and appropriate list macros.
   - Use \\resumeSubheading for (Company, Date, Role, location).
   - Use \\resumeItemListStart / \\resumeItem for bullets.
   - Use the comma-separated Technical Skills pattern for skills.
5. FALLBACK: For non-standard sections (Awards, Volunteer, etc.), use \\section followed by \\resumeItemListStart to ensure formatting consistency.
6. STYLING: Styling is secondary to content. If you aren't sure which macro to use, use a simple itemized list. NEVER omit data.
7. OPTIMIZATION: Only use "enhancedContent" where it maps directly to an original item. Do not "simplify" or "summarize" to save space.
8. ESCAPING: Use proper LaTeX escapes: & -> \\&, % -> \\%, $ -> \\$, etc.
9. IDENTITY: Replace the placeholder header (First Last, contact info) with the user's actual personal data.

---
LATEX SKELETON (FOR BODY STYLE):
${latexSkeleton}

---
JOB DESCRIPTION:
${jobDescription}

---
RESUME:
${resume}`;

    // ── Call Groq ─────────────────────────────────────────────
    const client = getClient();
    const chatCompletion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an expert resume optimizer and LaTeX specialist. Your mandate is ZERO INFORMATION LOSS. You generate the body of a LaTeX resume while maintaining its structural essence. You always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1, // Highly deterministic for better extraction
      max_tokens: 4096,   // Increased for long resumes
      response_format: { type: "json_object" },
    });

    const text = chatCompletion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);

    // Validate structure
    if (
      typeof parsed.score !== "number" ||
      !Array.isArray(parsed.missingKeywords) ||
      !Array.isArray(parsed.suggestions)
    ) {
      throw new Error("Unexpected response structure from AI model");
    }

    // Reconstruct full LaTeX string
    const fullLatex = `${latexPreamble}${parsed.latexBody}\n\\end{document}`;

    const result = {
      score: Math.round(parsed.score),
      scoreBreakdown: parsed.scoreBreakdown || null,
      missingKeywords: parsed.missingKeywords,
      suggestions: parsed.suggestions,
      latexCode: fullLatex,
    };

    // ── Store in cache ────────────────────────────────────────
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL_SECONDS });
        log("info", "Result cached", { cacheKey, ttl: CACHE_TTL_SECONDS });
      } catch (redisErr) {
        log("warn", "Failed to write to Redis cache", {
          error: redisErr instanceof Error ? redisErr.message : String(redisErr),
        });
      }
    }

    return NextResponse.json({ ...result, cached: false });
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
