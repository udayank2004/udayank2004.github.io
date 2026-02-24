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
  "missingKeywords": [
    { "keyword": "string", "priority": "high" | "medium" | "low", "context": "why this matters for the role" }
  ],
  "suggestions": [
    { "section": "Summary" | "Experience" | "Skills" | "Education" | "Projects" | "General", "suggestion": "actionable improvement", "impact": "high" | "medium" | "low" }
  ]
}

Scoring Rubric:
- 90-100: Near-perfect match — resume covers almost all required skills, experience level, and qualifications.
- 70-89: Strong match — resume aligns well but has a few notable gaps.
- 50-69: Moderate match — resume covers some requirements but is missing significant qualifications.
- Below 50: Weak match — resume lacks most of the key requirements.

Rules:
- Score honestly using the rubric above. Do not inflate.
- missingKeywords: List 3-8 missing skills/technologies/qualifications from the JD. Assign priority based on how critical they are to the role ("high" = deal-breaker, "medium" = important, "low" = nice-to-have).
- suggestions: List 3-6 specific, actionable improvements. Tag each with the resume section it applies to and its expected impact on match score.
- scoreBreakdown: Rate each dimension independently.

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
          content: "You are an expert resume optimizer and ATS (Applicant Tracking System) specialist. You provide brutally honest, data-driven resume analysis. Always respond with valid JSON only.",
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
    const parsed = JSON.parse(text);

    // Validate structure
    if (
      typeof parsed.score !== "number" ||
      !Array.isArray(parsed.missingKeywords) ||
      !Array.isArray(parsed.suggestions)
    ) {
      throw new Error("Unexpected response structure from AI model");
    }

    const result = {
      score: Math.round(parsed.score),
      scoreBreakdown: parsed.scoreBreakdown || null,
      missingKeywords: parsed.missingKeywords,
      suggestions: parsed.suggestions,
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
