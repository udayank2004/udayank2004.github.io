"use client";

import { useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";

const ResumeViewer = dynamic(() => import("@/components/ResumeViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      Loading PDF viewer…
    </div>
  ),
});
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
interface MissingKeyword {
  keyword: string;
  priority: "high" | "medium" | "low";
  context: string;
}

interface Suggestion {
  section: string;
  suggestion: string;
  impact: "high" | "medium" | "low";
  existingContent?: string;
  enhancedContent?: string;
}

interface ScoreBreakdown {
  skills: number;
  experience: number;
  education: number;
  overall: number;
}

interface AnalysisResult {
  score: number;
  scoreBreakdown: ScoreBreakdown | null;
  missingKeywords: MissingKeyword[];
  suggestions: Suggestion[];
}

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
  width: number;
  height: number;
  textBlocks: TextBlock[];
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
  const [resumePages, setResumePages] = useState<PageData[] | null>(null);
  const [resumeFileUrl, setResumeFileUrl] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [copied, setCopied] = useState(false);

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
      if (data.pages) setResumePages(data.pages);
      // Create a URL for the raw file so we can render it
      setResumeFileUrl(URL.createObjectURL(file));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "File upload failed.";
      setError(msg);
      setResume("");
      setResumeFileName(null);
      setResumePages(null);
      setResumeFileUrl(null);
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
    setResumePages(null);
    setResumeFileUrl(null);
    setActiveSection(null);
    setSelectedSuggestion(null);
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

              {/* Score Breakdown */}
              {results.scoreBreakdown && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-3 text-base font-semibold">Score Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {Object.entries(results.scoreBreakdown).map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-border/30 bg-background/30 p-3 text-center">
                          <p className="text-xs font-medium capitalize text-muted-foreground">{key}</p>
                          <p className={`mt-1 text-2xl font-bold tabular-nums ${scoreColor(value)}`}>{value}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Missing Keywords */}
              <div>
                <h3 className="mb-3 text-base font-semibold">
                  Missing Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.missingKeywords.map((kw, i) => {
                    const colors = {
                      high: "border-red-500/40 bg-red-500/10 text-red-300",
                      medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
                      low: "border-violet-500/30 bg-violet-500/10 text-violet-300",
                    };
                    return (
                      <Badge
                        key={i}
                        variant="secondary"
                        className={`border ${colors[kw.priority]} cursor-default`}
                        title={kw.context}
                      >
                        {kw.keyword}
                        <span className="ml-1.5 text-[10px] opacity-60">({kw.priority})</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Suggestions — clickable cards */}
              <div>
                <h3 className="mb-3 text-base font-semibold">
                  Actionable Suggestions
                  <span className="ml-2 text-xs font-normal text-muted-foreground">Click to view details</span>
                </h3>
                <ul className="space-y-2">
                  {results.suggestions.map((s, i) => {
                    const impactColors = {
                      high: "bg-red-500/10 text-red-400",
                      medium: "bg-amber-500/10 text-amber-400",
                      low: "bg-blue-500/10 text-blue-400",
                    };
                    return (
                      <li
                        key={i}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/30 bg-background/20 p-3 text-sm transition-all hover:border-violet-500/40 hover:bg-violet-500/5"
                        onClick={() => {
                          setSelectedSuggestion(s);
                          setActiveSection(s.section);
                        }}
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/40">
                              {s.section}
                            </Badge>
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium ${impactColors[s.impact]}`}>
                              {s.impact} impact
                            </span>
                          </div>
                          <span className="leading-relaxed text-muted-foreground">
                            {s.suggestion}
                          </span>
                        </div>
                        <svg className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Optimization Workspace Dialog ───────────────────────── */}
      <Dialog
        open={!!selectedSuggestion}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSuggestion(null);
            setActiveSection(null);
          }
        }}
      >
        <DialogContent className="h-[95vh] w-[70vw] max-w-none overflow-hidden border-border/40 bg-[#0a0a0f] p-0">
          <DialogHeader className="border-b border-border/30 px-6 py-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <span>Optimization Workspace</span>
              {selectedSuggestion && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 border-violet-500/40 text-violet-400">
                  {selectedSuggestion.section}
                </Badge>
              )}
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100" />
          </DialogHeader>

          {selectedSuggestion && (
            <div className="grid h-[calc(95vh-64px)] grid-cols-1 md:grid-cols-2">
              {/* Left — PDF Viewer */}
              <div className="h-full overflow-y-scroll border-r border-border/20 bg-white/5 p-4">
                {resumeFileUrl && resumePages ? (
                  <ResumeViewer
                    fileUrl={resumeFileUrl}
                    pages={resumePages}
                    highlightText={selectedSuggestion?.existingContent ?? null}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No PDF available for preview.
                  </div>
                )}
              </div>

              {/* Right — Before / After */}
              <div className="flex flex-col overflow-y-auto">
                {/* Suggestion Description */}
                <div className="border-b border-border/20 px-5 py-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {selectedSuggestion.suggestion}
                  </p>
                </div>

                {selectedSuggestion.existingContent && selectedSuggestion.enhancedContent ? (
                  <>
                    {/* Current */}
                    <div className="px-5 pt-4 pb-2">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
                        <span className="text-sm font-semibold text-red-400">Current Content</span>
                      </div>
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                        <p className="text-sm leading-relaxed text-red-300/80">
                          {selectedSuggestion.existingContent}
                        </p>
                      </div>
                    </div>

                    {/* Enhanced */}
                    <div className="px-5 pt-2 pb-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                          <span className="text-sm font-semibold text-emerald-400">Enhanced Content</span>
                        </div>
                        <button
                          type="button"
                          className={`rounded-md px-3 py-1 text-xs font-medium ring-1 transition-colors ${copied
                            ? "bg-emerald-500/20 text-emerald-300 ring-emerald-400/50"
                            : "text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/10"
                            }`}
                          onClick={() => {
                            navigator.clipboard.writeText(selectedSuggestion.enhancedContent!);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                        >
                          {copied ? "✓ Copied!" : "📋 Copy"}
                        </button>
                      </div>
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="text-sm leading-relaxed text-emerald-300/80">
                          {selectedSuggestion.enhancedContent}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center p-6">
                    <p className="text-sm text-muted-foreground italic">
                      No before/after content available for this suggestion.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
