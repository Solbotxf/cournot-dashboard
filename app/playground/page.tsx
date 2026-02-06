"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ParseResult, RunSummary, EvidenceItem, EvidenceBundle, ExecutionMode, DiscoveredSource } from "@/lib/types";
import { PlaygroundInput } from "@/components/playground/playground-input";
import { PlaygroundResults } from "@/components/playground/playground-results";
import {
  PipelineProgress,
  PipelineStep,
  createInitialSteps,
  updateStepStatus,
} from "@/components/playground/pipeline-progress";
import { cn } from "@/lib/utils";

type Phase = "input" | "prompting" | "prompted" | "resolving" | "resolved";

const API_BASE = "http://localhost:8000";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Map evidence bundle items to EvidenceItem[] */
function mapEvidenceItems(bundle: any): EvidenceItem[] {
  return (bundle?.items ?? []).map((item: any) => {
    let parsedExcerpt = "";
    if (item.parsed_value != null) {
      parsedExcerpt = typeof item.parsed_value === "string"
        ? item.parsed_value.slice(0, 500)
        : JSON.stringify(item.parsed_value).slice(0, 500);
    } else if (item.extracted_fields) {
      const ef = item.extracted_fields;
      const parts: string[] = [];
      if (ef.resolution_status) parts.push(`Status: ${ef.resolution_status}`);
      if (ef.confidence_score != null) parts.push(`Confidence: ${(ef.confidence_score * 100).toFixed(0)}%`);
      parsedExcerpt = parts.join(" | ");
    }

    return {
      evidence_id: item.evidence_id ?? "",
      source_uri: item.provenance?.source_uri ?? "",
      source_name: item.provenance?.source_id ?? "",
      tier: item.provenance?.tier ?? 0,
      fetched_at: item.provenance?.fetched_at ?? "",
      content_hash: item.provenance?.content_hash ?? "",
      parsed_excerpt: parsedExcerpt,
      status_code: item.status_code ?? 200,
      success: item.success,
      error: item.error,
      extracted_fields: item.extracted_fields ? {
        confidence_score: item.extracted_fields.confidence_score,
        resolution_status: item.extracted_fields.resolution_status,
        evidence_sources: (item.extracted_fields.evidence_sources ?? []).map((es: any) => ({
          source_id: es.source_id ?? "",
          url: es.url ?? "",
          credibility_tier: es.credibility_tier ?? "",
          relevance_reason: es.relevance_reason ?? "",
        })),
      } : undefined,
    };
  });
}

/** Map raw evidence bundles to typed EvidenceBundle[] */
function mapEvidenceBundles(bundles: any[]): EvidenceBundle[] {
  return bundles.map((bundle: any) => ({
    bundle_id: bundle.bundle_id ?? "",
    market_id: bundle.market_id ?? "",
    collector_name: bundle.collector_name ?? "unknown",
    weight: bundle.weight ?? 1.0,
    items: mapEvidenceItems(bundle),
    execution_time_ms: bundle.execution_time_ms,
  }));
}

/** Build RunSummary from individual step results (supports multiple bundles) */
function buildRunSummary(
  evidenceBundles: any[],
  reasoningTrace: any,
  verdict: any,
  porBundle: any,
  outcome: string,
  confidence: number,
  porRoot: string
): RunSummary {
  const verdictMeta = verdict?.metadata ?? {};
  const porMeta = porBundle?.metadata ?? {};

  const modeMap: Record<string, ExecutionMode> = {
    development: "dry_run",
    live: "live",
    replay: "replay",
    dry_run: "dry_run",
  };

  // Flatten all evidence items from all bundles for backward compatibility
  const allEvidenceItems = evidenceBundles.flatMap(bundle => mapEvidenceItems(bundle));

  // Map to typed evidence bundles
  const typedBundles = mapEvidenceBundles(evidenceBundles);

  // Collect discovered sources from all bundles
  const discoveredSources: DiscoveredSource[] = evidenceBundles.flatMap(
    (bundle: any) =>
      (bundle?.items ?? []).flatMap((item: any) =>
        (item.extracted_fields?.discovered_sources ?? []).map((ds: any) => ({
          url: ds.url ?? "",
          title: ds.title ?? "",
          relevance: ds.relevance ?? "medium",
        }))
      )
  );

  // Total execution time from all bundles
  const totalDurationMs = evidenceBundles.reduce(
    (sum, bundle) => sum + (bundle?.execution_time_ms ?? 0),
    0
  );

  return {
    market_id: verdict?.market_id ?? "",
    outcome: outcome as any ?? "UNKNOWN",
    confidence: confidence ?? 0,
    por_root: porRoot ?? "",
    prompt_spec_hash: verdict?.prompt_spec_hash ?? "",
    evidence_root: verdict?.evidence_root ?? "",
    reasoning_root: verdict?.reasoning_root ?? "",
    ok: true,
    verification_ok: verdictMeta.llm_review?.reasoning_valid ?? true,
    execution_mode: modeMap[porMeta.mode] ?? (porMeta.mode as ExecutionMode) ?? "dry_run",
    executed_at: porBundle?.created_at ?? new Date().toISOString(),
    duration_ms: totalDurationMs,
    checks: [],
    errors: [],
    evidence_summary: reasoningTrace?.evidence_summary,
    reasoning_summary: reasoningTrace?.reasoning_summary,
    justification: verdictMeta.justification,
    evidence_items: allEvidenceItems.length > 0 ? allEvidenceItems : undefined,
    evidence_bundles: typedBundles.length > 0 ? typedBundles : undefined,
    reasoning_steps: (reasoningTrace?.steps ?? []).length > 0 ? reasoningTrace.steps : undefined,
    llm_review: verdictMeta.llm_review
      ? {
          reasoning_valid: verdictMeta.llm_review.reasoning_valid ?? true,
          issues: verdictMeta.llm_review.reasoning_issues ?? [],
          confidence_adjustments: verdictMeta.llm_review.confidence_adjustments ?? [],
          final_justification: verdictMeta.llm_review.final_justification ?? "",
        }
      : undefined,
    discovered_sources: discoveredSources.length > 0 ? discoveredSources : undefined,
  };
}

/** Map the backend /step/resolve response to the RunSummary shape (for single-call mode) */
function toRunSummary(raw: any): RunSummary {
  const artifacts = raw.artifacts ?? {};
  // Support both new evidence_bundles array and legacy evidence_bundle
  const evidenceBundles = artifacts.evidence_bundles ??
    (artifacts.evidence_bundle ? [artifacts.evidence_bundle] : []);

  return buildRunSummary(
    evidenceBundles,
    artifacts.reasoning_trace,
    artifacts.verdict,
    artifacts.por_bundle,
    raw.outcome,
    raw.confidence,
    raw.por_root
  );
}

export default function PlaygroundPage() {
  // Phase
  const [phase, setPhase] = useState<Phase>("input");

  // Input state
  const [userInput, setUserInput] = useState("");
  const [predictionType, setPredictionType] = useState("binary");
  const [multiSelectChoices, setMultiSelectChoices] = useState<string[]>(["", ""]);
  const [resolutionDeadline, setResolutionDeadline] = useState("");
  const [dataSources, setDataSources] = useState<string[]>([]);
  const [strictMode, setStrictMode] = useState(false);

  // Collector selection (for multi-step mode)
  const [selectedCollectors, setSelectedCollectors] = useState<string[]>(["CollectorLLM"]);

  // Results
  const [promptResult, setPromptResult] = useState<ParseResult | null>(null);
  const [resolveResult, setResolveResult] = useState<RunSummary | null>(null);

  // Pipeline progress
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(createInitialSteps());
  const [useMultiStep, setUseMultiStep] = useState(true); // Toggle for multi-step vs single-call

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
    setSelectedCollectors(["CollectorLLM"]);
    setPromptResult(null);
    setResolveResult(null);
    setPipelineSteps(createInitialSteps());
  }

  function toggleCollector(collectorId: string) {
    setSelectedCollectors((prev) => {
      if (prev.includes(collectorId)) {
        // Don't allow deselecting all collectors
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== collectorId);
      }
      return [...prev, collectorId];
    });
  }

  async function handlePrompt() {
    setPhase("prompting");
    setPromptResult(null);
    setResolveResult(null);
    setPipelineSteps(createInitialSteps());

    // Update step to running
    setPipelineSteps((prev) => updateStepStatus(prev, "prompt", "running"));

    try {
      const res = await fetch(`${API_BASE}/step/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_input: userInput,
          strict_mode: strictMode,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data: ParseResult = await res.json();
      setPromptResult(data);
      setPipelineSteps((prev) => updateStepStatus(prev, "prompt", "completed"));
      setPhase("prompted");
    } catch (err) {
      setPipelineSteps((prev) => updateStepStatus(prev, "prompt", "error"));
      toast.error("Prompt failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setPhase("input");
    }
  }

  async function handleResolveMultiStep() {
    if (!promptResult?.prompt_spec || !promptResult?.tool_plan) return;

    setPhase("resolving");
    const steps = createInitialSteps();
    steps[0].status = "completed"; // Prompt already done
    setPipelineSteps(steps);

    const promptSpec = promptResult.prompt_spec;
    const toolPlan = promptResult.tool_plan;

    try {
      // Step 2: Collect (with multiple collectors)
      setPipelineSteps((prev) => updateStepStatus(prev, "collect", "running"));
      const collectRes = await fetch(`${API_BASE}/step/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_spec: promptSpec,
          tool_plan: toolPlan,
          collectors: selectedCollectors, // Use array of collectors
        }),
      });
      if (!collectRes.ok) throw new Error(`Collect failed: ${await collectRes.text()}`);
      const collectData = await collectRes.json();
      const evidenceBundles = collectData.evidence_bundles; // Now an array
      setPipelineSteps((prev) => updateStepStatus(prev, "collect", "completed"));

      // Step 3: Audit (pass array of bundles)
      setPipelineSteps((prev) => updateStepStatus(prev, "audit", "running"));
      const auditRes = await fetch(`${API_BASE}/step/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_spec: promptSpec,
          evidence_bundles: evidenceBundles, // Array
        }),
      });
      if (!auditRes.ok) throw new Error(`Audit failed: ${await auditRes.text()}`);
      const auditData = await auditRes.json();
      const reasoningTrace = auditData.reasoning_trace;
      setPipelineSteps((prev) => updateStepStatus(prev, "audit", "completed"));

      // Step 4: Judge (pass array of bundles)
      setPipelineSteps((prev) => updateStepStatus(prev, "judge", "running"));
      const judgeRes = await fetch(`${API_BASE}/step/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_spec: promptSpec,
          evidence_bundles: evidenceBundles, // Array
          reasoning_trace: reasoningTrace,
        }),
      });
      if (!judgeRes.ok) throw new Error(`Judge failed: ${await judgeRes.text()}`);
      const judgeData = await judgeRes.json();
      const verdict = judgeData.verdict;
      const outcome = judgeData.outcome;
      const confidence = judgeData.confidence;
      setPipelineSteps((prev) => updateStepStatus(prev, "judge", "completed"));

      // Step 5: Bundle (pass array of bundles)
      setPipelineSteps((prev) => updateStepStatus(prev, "bundle", "running"));
      const bundleRes = await fetch(`${API_BASE}/step/bundle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_spec: promptSpec,
          evidence_bundles: evidenceBundles, // Array
          reasoning_trace: reasoningTrace,
          verdict: verdict,
        }),
      });
      if (!bundleRes.ok) throw new Error(`Bundle failed: ${await bundleRes.text()}`);
      const bundleData = await bundleRes.json();
      const porBundle = bundleData.por_bundle;
      const porRoot = bundleData.por_root;
      setPipelineSteps((prev) => updateStepStatus(prev, "bundle", "completed"));

      // Build final result
      const summary = buildRunSummary(
        evidenceBundles,
        reasoningTrace,
        verdict,
        porBundle,
        outcome,
        confidence,
        porRoot
      );

      console.log("resolveResult:", JSON.stringify(summary, null, 2));
      setResolveResult(summary);
      setPhase("resolved");
    } catch (err) {
      toast.error("Resolution failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setPhase("prompted");
    }
  }

  async function handleResolveSingleCall() {
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
      const summary = toRunSummary(data);
      console.log("resolveResult:", JSON.stringify(summary, null, 2));
      setResolveResult(summary);
      setPhase("resolved");
    } catch (err) {
      toast.error("Resolve failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setPhase("prompted");
    }
  }

  function handleResolve() {
    if (useMultiStep) {
      handleResolveMultiStep();
    } else {
      handleResolveSingleCall();
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
        <div className="flex items-center gap-3">
          {/* Multi-step toggle */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={useMultiStep}
              onChange={(e) => setUseMultiStep(e.target.checked)}
              className="rounded border-border"
              disabled={isLoading}
            />
            Multi-step mode
          </label>
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
            useMultiStep={useMultiStep}
            selectedCollectors={selectedCollectors}
            onToggleCollector={toggleCollector}
          />
        </div>
      </div>

      {/* Pipeline Progress (multi-step mode) */}
      {phase === "resolving" && useMultiStep && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PipelineProgress steps={pipelineSteps} currentStep={null} />
        </div>
      )}

      {/* Simple loading (single-call mode or prompting) */}
      {phase === "prompting" && (
        <div className="animate-in fade-in duration-300">
          <div className="rounded-xl border border-border/50 bg-card/50 p-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
              <span className="text-sm text-muted-foreground">Compiling prompt specification...</span>
            </div>
          </div>
        </div>
      )}
      {phase === "resolving" && !useMultiStep && (
        <div className="animate-in fade-in duration-300">
          <div className="rounded-xl border border-border/50 bg-card/50 p-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
              <span className="text-sm text-muted-foreground">Resolving market question...</span>
            </div>
          </div>
        </div>
      )}

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
