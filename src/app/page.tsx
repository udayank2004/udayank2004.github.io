"use client";

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AnalysisResult {
  score: number;
  missingKeywords: string[];
  suggestions: string[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function progressColor(score: number) {
  if (score >= 80) return "[&>div]:bg-emerald-500";
  if (score >= 50) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [showExtractedData, setShowExtractedData] = useState(false);

  const resumeFileRef = useRef<HTMLInputElement>(null);

  async function handleResumeUpload(file: File) {
    setUploadingField("resume");
    setError(null);
    setResumeFileName(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse file");
      setResume(data.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "File upload failed.";
      setError(msg);
      setResume("");
      setResumeFileName(null);
    } finally {
      setUploadingField(null);
    }
  }

  async function handleAnalyze() {
    if (!jobDescription.trim() || !resume.trim()) return;
    setIsLoading(true);
    setResults(null);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, resume }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResults(data as AnalysisResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setJobDescription("");
    setResume("");
    setResumeFileName(null);
    setResults(null);
    setError(null);
    setIsLoading(false);
    setUploadingField(null);
    setShowExtractedData(false);
    if (resumeFileRef.current) resumeFileRef.current.value = "";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] px-4 py-10 sm:px-6 lg:px-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mx-auto mb-10 max-w-5xl text-center">
        <h1 className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          Resume AI Optimizer
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Paste a job description and upload your resume — get instant, actionable
          feedback.
        </p>
      </header>

      {/* ── Input Grid ─────────────────────────────────────────── */}
      <section className="mx-auto mb-8 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left — Job Description (Text only) */}
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              <Label htmlFor="jd" className="text-base font-semibold">
                Paste Job Description Here
              </Label>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="jd"
              placeholder="Copy the full job description and paste it here…"
              className="h-[300px] resize-none overflow-y-auto bg-background/50 text-sm leading-relaxed"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Right — Resume (Upload only) */}
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              <Label className="text-base font-semibold">
                Upload Your Resume
              </Label>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex h-[300px] flex-col items-center justify-center space-y-4">
            {/* Upload status indicator — icon is the clickable upload trigger */}
            {resumeFileName && resume ? (
              <div
                className="flex cursor-pointer flex-col items-center gap-2 text-center transition-opacity hover:opacity-80"
                onClick={() => resumeFileRef.current?.click()}
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
            ) : uploadingField === "resume" ? (
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
                onClick={() => resumeFileRef.current?.click()}
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

            {/* Hidden file input */}
            <input
              ref={resumeFileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleResumeUpload(f);
                e.target.value = "";
              }}
            />
            {/* Show extracted data button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!resume}
              onClick={() => setShowExtractedData(true)}
              className="cursor-pointer text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              👁 Show extracted data
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* ── Analyze & Reset Buttons ────────────────────────────── */}
      <div className="mx-auto mb-10 flex max-w-5xl items-center justify-center gap-4">
        <Button
          size="lg"
          disabled={isLoading || !jobDescription.trim() || !resume.trim()}
          onClick={handleAnalyze}
          className="cursor-pointer bg-gradient-to-r from-blue-600 to-violet-600 px-10 py-6 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:from-blue-500 hover:to-violet-500 hover:shadow-xl hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Analyzing…
            </>
          ) : (
            "Analyze & Optimize"
          )}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={isLoading && !jobDescription && !resume && !results && !error}
          onClick={handleReset}
          className="cursor-pointer border-red-500/30 px-8 py-6 text-base font-semibold text-red-400 transition-all hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset
        </Button>
      </div>

      {/* ── Error ──────────────────────────────────────────────── */}
      {error && (
        <div className="mx-auto mb-8 max-w-5xl rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────── */}
      {results && (
        <section className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Match Score */}
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
                <div className="text-center sm:text-left">
                  <p className="mb-1 text-sm font-medium text-muted-foreground">
                    Match Score
                  </p>
                  <span
                    className={`text-6xl font-black tabular-nums ${scoreColor(results.score)}`}
                  >
                    {results.score}%
                  </span>
                </div>
                <div className="w-full flex-1">
                  <Progress
                    value={results.score}
                    className={`h-3 ${progressColor(results.score)}`}
                  />
                </div>
              </div>

              <Separator />

              {/* Missing Keywords */}
              <div>
                <h3 className="mb-3 text-base font-semibold">
                  Missing Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.missingKeywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="border border-violet-500/30 bg-violet-500/10 text-violet-300"
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Suggestions */}
              <div>
                <h3 className="mb-3 text-base font-semibold">
                  Actionable Suggestions
                </h3>
                <ul className="space-y-3">
                  {results.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed text-muted-foreground">
                        {s}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Extracted Data Dialog ───────────────────────────────── */}
      <Dialog open={showExtractedData} onOpenChange={setShowExtractedData}>
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
    </div>
  );
}
