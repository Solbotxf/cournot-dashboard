"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ParseResult, RunSummary, EvidenceItem, ExecutionMode, DiscoveredSource } from "@/lib/types";
import { PlaygroundInput } from "@/components/playground/playground-input";
import { PlaygroundLoading } from "@/components/playground/playground-loading";
import { PlaygroundResults } from "@/components/playground/playground-results";
import { cn } from "@/lib/utils";

type Phase = "input" | "prompting" | "prompted" | "resolving" | "resolved";

const API_BASE = "http://localhost:8000";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Map the backend /step/resolve response to the RunSummary shape the UI expects. */
function toRunSummary(raw: any): RunSummary {
  const artifacts = raw.artifacts ?? {};
  const verdict = artifacts.verdict ?? {};
  const verdictMeta = verdict.metadata ?? {};
  const trace = artifacts.reasoning_trace ?? {};
  const bundle = artifacts.evidence_bundle ?? {};
  const por = artifacts.por_bundle ?? {};
  const porMeta = por.metadata ?? {};

  // Map backend mode string to ExecutionMode
  const modeMap: Record<string, ExecutionMode> = {
    development: "dry_run",
    live: "live",
    replay: "replay",
    dry_run: "dry_run",
  };

  // Map evidence bundle items to EvidenceItem[]
  const evidenceItems: EvidenceItem[] = (bundle.items ?? []).map((item: any) => ({
    evidence_id: item.evidence_id ?? "",
    source_uri: item.provenance?.source_uri ?? "",
    source_name: item.provenance?.source_id ?? "",
    tier: item.provenance?.tier ?? 0,
    fetched_at: item.provenance?.fetched_at ?? "",
    content_hash: item.provenance?.content_hash ?? "",
    parsed_excerpt:
      typeof item.parsed_value === "string"
        ? item.parsed_value.slice(0, 500)
        : JSON.stringify(item.parsed_value).slice(0, 500),
    status_code: item.status_code ?? 200,
  }));

  // Extract discovered sources from evidence items
  const discoveredSources: DiscoveredSource[] = (bundle.items ?? []).flatMap(
    (item: any) =>
      (item.extracted_fields?.discovered_sources ?? []).map((ds: any) => ({
        url: ds.url ?? "",
        title: ds.title ?? "",
        relevance: ds.relevance ?? "medium",
      }))
  );

  return {
    market_id: raw.market_id ?? "",
    outcome: raw.outcome ?? "UNKNOWN",
    confidence: raw.confidence ?? 0,
    por_root: raw.por_root ?? "",
    prompt_spec_hash: verdict.prompt_spec_hash ?? "",
    evidence_root: verdict.evidence_root ?? "",
    reasoning_root: verdict.reasoning_root ?? "",
    ok: raw.ok ?? false,
    verification_ok: verdictMeta.llm_review?.reasoning_valid ?? raw.ok ?? false,
    execution_mode: modeMap[porMeta.mode] ?? (porMeta.mode as ExecutionMode) ?? undefined,
    executed_at: por.created_at ?? new Date().toISOString(),
    duration_ms: bundle.execution_time_ms ?? 0,
    checks: [],
    errors: raw.errors ?? [],
    // Extended fields
    evidence_summary: trace.evidence_summary,
    reasoning_summary: trace.reasoning_summary,
    justification: verdictMeta.justification,
    evidence_items: evidenceItems.length > 0 ? evidenceItems : undefined,
    reasoning_steps: (trace.steps ?? []).length > 0 ? trace.steps : undefined,
    llm_review: verdictMeta.llm_review
      ? {
          reasoning_valid: verdictMeta.llm_review.reasoning_valid ?? true,
          issues: verdictMeta.llm_review.reasoning_issues ?? [],
          confidence_adjustments: verdictMeta.llm_review.confidence_adjustments ?? [],
          final_justification: verdictMeta.llm_review.final_justification ?? "",
        }
      : undefined,
    discovered_sources:
      discoveredSources.length > 0 ? discoveredSources : undefined,
  };
}

export default function PlaygroundPage() {
  // Phase
  const [phase, setPhase] = useState<Phase>("input");

  // Input state
  const [userInput, setUserInput] = useState("");
  const [predictionType, setPredictionType] = useState("binary");
  const [multiSelectChoices, setMultiSelectChoices] = useState<string[]>([
    "",
    "",
  ]);
  const [resolutionDeadline, setResolutionDeadline] = useState("");
  const [dataSources, setDataSources] = useState<string[]>([]);
  const [strictMode, setStrictMode] = useState(false);

  // Results
  const [promptResult, setPromptResult] = useState<ParseResult | null>(null);
  const [resolveResult, setResolveResult] = useState<RunSummary | null>(null);

  const isLoading = phase === "prompting" || phase === "resolving";
  const hasResults = phase === "prompted" || phase === "resolved";

  function handleReset() {
    setPhase("input");
    setUserInput("");
    setPredictionType("binary");
    setMultiSelectChoices(["", ""]);
    setResolutionDeadline("");
    setDataSources([]);
    setStrictMode(false);
    setPromptResult(null);
    setResolveResult(null);
  }

  async function handlePrompt() {
    setPhase("prompting");
    setPromptResult(null);
    setResolveResult(null);

    try {
      const res = await fetch(`${API_BASE}/step/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_input: userInput,
          strict_mode: false,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data: ParseResult = await res.json();
      setPromptResult(data);
      setPhase("prompted");
    } catch (err) {
      toast.error("Prompt failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setPhase("input");
    }
  }

  async function handleResolve() {
    if (!promptResult?.prompt_spec || !promptResult?.tool_plan) return;

    setPhase("resolving");

    try {
      const res = await fetch(`${API_BASE}/step/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_spec: promptResult.prompt_spec,
          tool_plan: promptResult.tool_plan,
          execution_mode: "development",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResolveResult(toRunSummary(data));
      setPhase("resolved");
    } catch (err) {
      toast.error("Resolve failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setPhase("prompted");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Playground</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Test market questions against the oracle pipeline
          </p>
        </div>
        {phase !== "input" && (
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
        )}
      </div>

      {/* Input form container with transition */}
      <div
        className={cn(
          "transition-all duration-500",
          phase === "input"
            ? "min-h-[50vh] flex items-center justify-center"
            : "min-h-0"
        )}
      >
        <div className={cn(phase === "input" ? "w-full max-w-2xl" : "w-full")}>
          <PlaygroundInput
            userInput={userInput}
            onUserInputChange={setUserInput}
            predictionType={predictionType}
            onPredictionTypeChange={setPredictionType}
            multiSelectChoices={multiSelectChoices}
            onMultiSelectChoicesChange={setMultiSelectChoices}
            resolutionDeadline={resolutionDeadline}
            onResolutionDeadlineChange={setResolutionDeadline}
            dataSources={dataSources}
            onDataSourcesChange={setDataSources}
            strictMode={strictMode}
            onStrictModeChange={setStrictMode}
            onPrompt={handlePrompt}
            onResolve={handleResolve}
            canResolve={
              promptResult !== null &&
              promptResult.ok &&
              promptResult.prompt_spec !== null &&
              promptResult.tool_plan !== null
            }
            isLoading={isLoading}
            compact={hasResults}
          />
        </div>
      </div>

      {/* Loading skeleton */}
      {phase === "prompting" && <PlaygroundLoading phase="prompting" />}
      {phase === "resolving" && <PlaygroundLoading phase="resolving" />}

      {/* Results */}
      {hasResults && promptResult && (
        <PlaygroundResults
          promptResult={promptResult}
          resolveResult={resolveResult}
          userInput={userInput}
        />
      )}
    </div>
  );
}
