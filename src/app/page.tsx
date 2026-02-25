"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// Types
import { AnalysisResult, PageData, Suggestion, ResumeSchema } from "@/types";

// Components
import { MainHeader } from "@/components/MainHeader";
import { JobDescriptionInput } from "@/components/JobDescriptionInput";
import { ResumeUploadCard } from "@/components/ResumeUploadCard";
import { AnalysisActionButtons } from "@/components/AnalysisActionButtons";
import { MatchScoreDisplay } from "@/components/MatchScoreDisplay";
import { ScoreBreakdownGrid } from "@/components/ScoreBreakdownGrid";
import { MissingKeywordsList } from "@/components/MissingKeywordsList";
import { ActionableSuggestions } from "@/components/ActionableSuggestions";
import { OptimizationWorkspace } from "@/components/OptimizationWorkspace";
import { ExtractedDataDialog } from "@/components/ExtractedDataDialog";

const ResumeVisualizerWorkspace = dynamic(
  () =>
    import("@/components/ResumeVisualizerWorkspace").then(
      (mod) => mod.ResumeVisualizerWorkspace
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f] text-muted-foreground">
        Loading Resume Builder…
      </div>
    ),
  }
);

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
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [showVisualizer, setShowVisualizer] = useState(false);

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
      if (!res.ok) throw new Error(data.error || "Analysis failed");

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
    setSelectedSuggestion(null);
    setShowVisualizer(false);
    setResults(null);
    setError(null);
    setIsLoading(false);
    setUploadingField(null);
    setShowExtractedData(false);
    if (resumeFileRef.current) resumeFileRef.current.value = "";
  }

  /* ── Visualizer Full-Screen View ─────────────────────────── */
  if (showVisualizer && results?.latexCode) {
    return (
      <ResumeVisualizerWorkspace
        initialLatex={results.latexCode}
        onBack={() => setShowVisualizer(false)}
      />
    );
  }

  /* ── Main Analysis View ──────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] px-4 py-10 sm:px-6 lg:px-8">
      <MainHeader />

      <section className="mx-auto mb-8 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        <JobDescriptionInput
          value={jobDescription}
          onChange={setJobDescription}
        />
        <ResumeUploadCard
          resumeFileName={resumeFileName}
          hasResume={!!resume}
          isUploading={uploadingField === "resume"}
          onUpload={handleResumeUpload}
          onShowExtractedData={() => setShowExtractedData(true)}
        />
      </section>

      <AnalysisActionButtons
        onAnalyze={handleAnalyze}
        onReset={handleReset}
        isLoading={isLoading}
        disableAnalyze={!jobDescription.trim() || !resume.trim()}
        disableReset={isLoading && !jobDescription && !resume && !results && !error}
      />

      {error && (
        <div className="mx-auto mb-8 max-w-5xl rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      {results && (
        <section className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <MatchScoreDisplay score={results.score} />

              {results.scoreBreakdown && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-3 text-base font-semibold">Score Breakdown</h3>
                    <ScoreBreakdownGrid breakdown={results.scoreBreakdown} />
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h3 className="mb-3 text-base font-semibold">Missing Keywords</h3>
                <MissingKeywordsList keywords={results.missingKeywords} />
              </div>

              <Separator />

              <div>
                <h3 className="mb-3 text-base font-semibold">
                  Actionable Suggestions
                  <span className="ml-2 text-xs font-normal text-muted-foreground">Click to view details</span>
                </h3>
                <ActionableSuggestions
                  suggestions={results.suggestions}
                  onSuggestionClick={setSelectedSuggestion}
                />
              </div>

              {/* ── Visualize Button ───────────────── */}
              {results.latexCode && (
                <>
                  <Separator />
                  <div className="flex justify-center">
                    <Button
                      size="lg"
                      onClick={() => setShowVisualizer(true)}
                      className="cursor-pointer bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-6 text-base font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:from-violet-500 hover:to-purple-500 hover:shadow-xl hover:shadow-purple-500/30"
                    >
                      <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Visualize the Optimized Resume
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <OptimizationWorkspace
        selectedSuggestion={selectedSuggestion}
        resumeFileUrl={resumeFileUrl}
        resumePages={resumePages}
        onClose={() => setSelectedSuggestion(null)}
      />

      <ExtractedDataDialog
        isOpen={showExtractedData}
        onClose={() => setShowExtractedData(false)}
        resume={resume}
        resumeFileName={resumeFileName}
      />
    </div>
  );
}
