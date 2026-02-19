"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { ParseResult, RunSummary, EvidenceItem, EvidenceBundle, ExecutionMode, DiscoveredSource, ExecutionLog } from "@/lib/types";
import { PlaygroundInput } from "@/components/playground/playground-input";
import { PlaygroundResults } from "@/components/playground/playground-results";
import {
  PipelineProgress,
  PipelineStep,
  createInitialSteps,
  updateStepStatus,
} from "@/components/playground/pipeline-progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import {
  trackPlaygroundCodeEntered,
  trackPlaygroundPrompt,
  trackPlaygroundResolve,
  trackPlaygroundProviderChange,
  trackPlaygroundCollectorToggle,
  trackPlaygroundReset,
  trackPlaygroundStepComplete,
} from "@/lib/analytics";

// ─── Code-gated API helper ──────────────────────────────────────────────────

const STORAGE_KEY = "playground_code";
const LOCALHOST_MODE = process.env.NEXT_PUBLIC_ENABLE_PLAYGROUND_LOCALHOST_MODE === "true";

class InvalidCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCodeError";
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Localhost mode: call http://localhost:8000{path} directly with raw body/method.
 * Proxy mode: wrap in { code, post_data, path, method } and POST to /api/proxy/ai_data.
 */
async function callApi(code: string, path: string, body: Record<string, any> = {}, method: "GET" | "POST" = "POST"): Promise<any> {
  if (LOCALHOST_MODE) {
    return callLocalhost(path, body, method);
  }
  return callProxy(code, path, body, method);
}

/** Direct call to localhost:8000 — no code wrapping, raw JSON response */
async function callLocalhost(path: string, body: Record<string, any>, method: "GET" | "POST"): Promise<any> {
  const url = `http://localhost:8000${path}`;
  const res = await fetch(url, {
    method,
    ...(method === "POST" && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

/** Proxy call via /api/proxy/ai_data — wraps body in { code, post_data, path, method } */
async function callProxy(code: string, path: string, body: Record<string, any>, method: "GET" | "POST"): Promise<any> {
  const res = await fetch("/api/proxy/ai_data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      post_data: JSON.stringify(body),
      path,
      method,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const json = await res.json();

  if (json.code === 4100) {
    throw new InvalidCodeError(json.msg || "Invalid access code");
  }

  if (json.code !== 0) {
    throw new Error(json.msg || "API error");
  }

  const resultStr = json.data?.result;
  if (typeof resultStr === "string") {
    try {
      return JSON.parse(resultStr);
    } catch {
      return resultStr;
    }
  }

  return json.data;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProviderInfo {
  provider: string;
  default_model: string;
}

interface CollectorInfo {
  id: string;
  name: string;
  description: string;
}

type Phase = "input" | "prompting" | "prompted" | "resolving" | "resolved";

// ─── Evidence / RunSummary mapping helpers ──────────────────────────────────

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
          source_id: es.source_id ?? null,
          url: es.url ?? "",
          credibility_tier: typeof es.credibility_tier === "number" ? es.credibility_tier : 3,
          key_fact: es.key_fact ?? "",
          supports: es.supports ?? "N/A",
          date_published: es.date_published ?? null,
        })),
        hypothesis_match: item.extracted_fields.hypothesis_match,
        discrepancies: item.extracted_fields.discrepancies,
        hypothetical_document: item.extracted_fields.hypothetical_document,
        conflicts: item.extracted_fields.conflicts,
        missing_info: item.extracted_fields.missing_info,
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

  const allEvidenceItems = evidenceBundles.flatMap(bundle => mapEvidenceItems(bundle));
  const typedBundles = mapEvidenceBundles(evidenceBundles);

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

// ─── Page Component ─────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  // Access code
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [codeLoaded, setCodeLoaded] = useState(false);
  const [codeInput, setCodeInput] = useState("");

  // Load code from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setAccessCode(stored);
    setCodeLoaded(true);
  }, []);

  const handleInvalidCode = useCallback(() => {
    setAccessCode(null);
    localStorage.removeItem(STORAGE_KEY);
    toast.error("Invalid access code", { description: "Please re-enter your code." });
  }, []);


  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = codeInput.trim();
    if (!code) return;
    localStorage.setItem(STORAGE_KEY, code);
    setAccessCode(code);
    setCodeInput("");
    trackPlaygroundCodeEntered(code);
  }

  function handleChangeCode() {
    setAccessCode(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  // Phase
  const [phase, setPhase] = useState<Phase>("input");

  // Input state
  const [userInput, setUserInput] = useState("");

  // Collector selection (for multi-step mode)
  const [availableCollectors, setAvailableCollectors] = useState<CollectorInfo[]>([]);
  const [collectorCounts, setCollectorCounts] = useState<Record<string, number>>({});

  // Derive selectedCollectors from counts (e.g. {GeminiGrounded: 2} => ['GeminiGrounded', 'GeminiGrounded'])
  const selectedCollectors = Object.entries(collectorCounts).flatMap(([id, count]) =>
    Array(count).fill(id)
  );

  // LLM provider/model selection
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("");

  // Fetch capabilities via ai_data
  useEffect(() => {
    if (!accessCode) return;

    callApi(accessCode, "/capabilities", {}, "GET")
      .then((data) => {
        if (Array.isArray(data.providers)) {
          setProviders(data.providers);
        }
        if (Array.isArray(data.steps)) {
          const collectorStep = data.steps.find((s: any) => s.step === "collector");
          if (collectorStep && Array.isArray(collectorStep.agents)) {
            const collectors: CollectorInfo[] = collectorStep.agents.map((a: any) => ({
              id: a.name,
              name: (a.name as string).replace(/^Collector/, ""),
              description: a.description ?? "",
            }));
            setAvailableCollectors(collectors);
            const defaultCollector = collectorStep.agents.find((a: any) => !a.is_fallback);
            if (defaultCollector) {
              setCollectorCounts({ [defaultCollector.name]: 1 });
            } else if (collectors.length > 0) {
              setCollectorCounts({ [collectors[0].id]: 1 });
            }
          }
        }
      })
      .catch((err) => {
        if (err instanceof InvalidCodeError) {
          handleInvalidCode();
        } else {
          console.warn("Failed to fetch capabilities:", err);
          toast.error("Failed to load capabilities", {
            description: err instanceof Error ? err.message : "Collector and provider options may not be available.",
          });
        }
      });
  }, [accessCode, handleInvalidCode]);

  // Results
  const [promptResult, setPromptResult] = useState<ParseResult | null>(null);
  const [resolveResult, setResolveResult] = useState<RunSummary | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);

  // Pipeline progress
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(createInitialSteps());
  const [useMultiStep, setUseMultiStep] = useState(true);

  const isLoading = phase === "prompting" || phase === "resolving";
  const hasResults = phase === "prompted" || phase === "resolved";

  function handleReset() {
    setPhase("input");
    setUserInput("");
    setCollectorCounts(availableCollectors.length > 0 ? { [availableCollectors[0].id]: 1 } : {});
    setSelectedProvider(null);
    setSelectedModel("");
    setPromptResult(null);
    setResolveResult(null);
    setExecutionLogs([]);
    setPipelineSteps(createInitialSteps());
    if (accessCode) trackPlaygroundReset(accessCode);
  }

  function toggleCollector(collectorId: string) {
    const willSelect = !(collectorCounts[collectorId] > 0);
    if (accessCode) trackPlaygroundCollectorToggle(accessCode, collectorId, willSelect);
    setCollectorCounts((prev) => {
      const next = { ...prev };
      if (next[collectorId] > 0) {
        // Don't allow removing the last collector
        const totalEnabled = Object.values(next).reduce((s, c) => s + c, 0);
        if (totalEnabled <= next[collectorId]) return prev;
        delete next[collectorId];
      } else {
        next[collectorId] = 1;
      }

      const enabledIds = Object.keys(next).filter((id) => next[id] > 0);
      const hasGemini = enabledIds.some((c) => c.toLowerCase().includes("geminigrounded"));
      const onlyGemini = hasGemini && enabledIds.length === 1;

      if (onlyGemini) {
        const googleProvider = providers.find((p) => p.provider.toLowerCase() === "google");
        if (googleProvider) {
          setSelectedProvider(googleProvider.provider);
          setSelectedModel(googleProvider.default_model);
        }
      }

      return next;
    });
  }

  function setCollectorCount(collectorId: string, count: number) {
    setCollectorCounts((prev) => {
      const next = { ...prev };
      if (count <= 0) {
        // Don't allow removing the last collector
        const totalEnabled = Object.values(next).reduce((s, c) => s + c, 0);
        if (totalEnabled <= (next[collectorId] ?? 0)) return prev;
        delete next[collectorId];
      } else {
        next[collectorId] = Math.min(count, 5);
      }
      return next;
    });
  }

  async function handlePrompt() {
    if (!accessCode) return;
    trackPlaygroundPrompt(accessCode, userInput.length);
    setPhase("prompting");
    setPromptResult(null);
    setResolveResult(null);
    setExecutionLogs([]);
    setPipelineSteps(createInitialSteps());
    setPipelineSteps((prev) => updateStepStatus(prev, "prompt", "running"));

    try {
      const data: ParseResult = await callApi(accessCode, "/step/prompt", {
        user_input: userInput,
        ...(selectedProvider && { llm_provider: selectedProvider }),
        ...(selectedProvider && selectedModel && { llm_model: selectedModel }),
      });
      setPromptResult(data);
      setPipelineSteps((prev) => updateStepStatus(prev, "prompt", "completed"));
      trackPlaygroundStepComplete(accessCode, "prompt", true);
      setPhase("prompted");
    } catch (err) {
      trackPlaygroundStepComplete(accessCode, "prompt", false);
      if (err instanceof InvalidCodeError) {
        handleInvalidCode();
        setPhase("input");
        return;
      }
      setPipelineSteps((prev) => updateStepStatus(prev, "prompt", "error"));
      toast.error("Prompt failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setPhase("input");
    }
  }

  async function handleResolveMultiStep() {
    if (!accessCode || !promptResult?.prompt_spec || !promptResult?.tool_plan) return;

    setPhase("resolving");
    const steps = createInitialSteps();
    steps[0].status = "completed";
    setPipelineSteps(steps);

    const promptSpec = promptResult.prompt_spec;
    const toolPlan = promptResult.tool_plan;

    try {
      // Step 2: Collect
      setPipelineSteps((prev) => updateStepStatus(prev, "collect", "running"));
      const collectData = await callApi(accessCode, "/step/collect", {
        prompt_spec: promptSpec,
        tool_plan: toolPlan,
        collectors: selectedCollectors,
        ...(selectedProvider && { llm_provider: selectedProvider }),
        ...(selectedProvider && selectedModel && { llm_model: selectedModel }),
      });
      if (Array.isArray(collectData.execution_logs)) {
        setExecutionLogs(collectData.execution_logs);
      }
      if (collectData.ok === false || (Array.isArray(collectData.errors) && collectData.errors.length > 0)) {
        const errMsg = collectData.errors?.join("; ") || "Collect returned errors";
        setPipelineSteps((prev) => updateStepStatus(prev, "collect", "error"));
        throw new Error(errMsg);
      }
      const evidenceBundles = collectData.evidence_bundles;
      setPipelineSteps((prev) => updateStepStatus(prev, "collect", "completed"));
      trackPlaygroundStepComplete(accessCode, "collect", true);

      // Step 3: Audit
      setPipelineSteps((prev) => updateStepStatus(prev, "audit", "running"));
      const auditData = await callApi(accessCode, "/step/audit", {
        prompt_spec: promptSpec,
        evidence_bundles: evidenceBundles,
        ...(selectedProvider && { llm_provider: selectedProvider }),
        ...(selectedProvider && selectedModel && { llm_model: selectedModel }),
      });
      if (auditData.ok === false || (Array.isArray(auditData.errors) && auditData.errors.length > 0)) {
        const errMsg = auditData.errors?.join("; ") || "Audit returned errors";
        setPipelineSteps((prev) => updateStepStatus(prev, "audit", "error"));
        throw new Error(errMsg);
      }
      const reasoningTrace = auditData.reasoning_trace;
      setPipelineSteps((prev) => updateStepStatus(prev, "audit", "completed"));
      trackPlaygroundStepComplete(accessCode, "audit", true);

      // Step 4: Judge
      setPipelineSteps((prev) => updateStepStatus(prev, "judge", "running"));
      const judgeData = await callApi(accessCode, "/step/judge", {
        prompt_spec: promptSpec,
        evidence_bundles: evidenceBundles,
        reasoning_trace: reasoningTrace,
        ...(selectedProvider && { llm_provider: selectedProvider }),
        ...(selectedProvider && selectedModel && { llm_model: selectedModel }),
      });
      if (judgeData.ok === false || (Array.isArray(judgeData.errors) && judgeData.errors.length > 0)) {
        const errMsg = judgeData.errors?.join("; ") || "Judge returned errors";
        setPipelineSteps((prev) => updateStepStatus(prev, "judge", "error"));
        throw new Error(errMsg);
      }
      const verdict = judgeData.verdict;
      const outcome = judgeData.outcome;
      const confidence = judgeData.confidence;
      setPipelineSteps((prev) => updateStepStatus(prev, "judge", "completed"));
      trackPlaygroundStepComplete(accessCode, "judge", true);

      // Step 5: Bundle
      setPipelineSteps((prev) => updateStepStatus(prev, "bundle", "running"));
      const bundleData = await callApi(accessCode, "/step/bundle", {
        prompt_spec: promptSpec,
        evidence_bundles: evidenceBundles,
        reasoning_trace: reasoningTrace,
        verdict: verdict,
      });
      if (bundleData.ok === false || (Array.isArray(bundleData.errors) && bundleData.errors.length > 0)) {
        const errMsg = bundleData.errors?.join("; ") || "Bundle returned errors";
        setPipelineSteps((prev) => updateStepStatus(prev, "bundle", "error"));
        throw new Error(errMsg);
      }
      const porBundle = bundleData.por_bundle;
      const porRoot = bundleData.por_root;
      setPipelineSteps((prev) => updateStepStatus(prev, "bundle", "completed"));
      trackPlaygroundStepComplete(accessCode, "bundle", true);

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
      if (err instanceof InvalidCodeError) {
        handleInvalidCode();
        setPhase("input");
        return;
      }
      toast.error("Resolution failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setPhase("prompted");
    }
  }

  async function handleResolveSingleCall() {
    if (!accessCode || !promptResult?.prompt_spec || !promptResult?.tool_plan) return;

    setPhase("resolving");

    try {
      const data = await callApi(accessCode, "/step/resolve", {
        prompt_spec: promptResult.prompt_spec,
        tool_plan: promptResult.tool_plan,
        execution_mode: "development",
        ...(selectedProvider && { llm_provider: selectedProvider }),
        ...(selectedProvider && selectedModel && { llm_model: selectedModel }),
      });

      const summary = toRunSummary(data);
      console.log("resolveResult:", JSON.stringify(summary, null, 2));
      setResolveResult(summary);
      setPhase("resolved");
    } catch (err) {
      if (err instanceof InvalidCodeError) {
        handleInvalidCode();
        setPhase("input");
        return;
      }
      toast.error("Resolve failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setPhase("prompted");
    }
  }

  function handleResolve() {
    if (accessCode) {
      trackPlaygroundResolve(
        accessCode,
        useMultiStep ? "multi_step" : "single_call",
        selectedCollectors
      );
    }
    if (useMultiStep) {
      handleResolveMultiStep();
    } else {
      handleResolveSingleCall();
    }
  }

  // ─── Code gate ──────────────────────────────────────────────────────────────

  if (!codeLoaded) {
    return null;
  }

  if (!accessCode) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-sm border-border/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/20">
                <Lock className="h-5 w-5 text-violet-400" />
              </div>
              <h2 className="text-lg font-semibold">Access Code Required</h2>
              <p className="text-sm text-muted-foreground">
                Enter your access code to use the playground.
              </p>
            </div>
            <form onSubmit={handleCodeSubmit} className="space-y-3">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Enter code"
                autoFocus
                className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
              <button
                type="submit"
                disabled={!codeInput.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enter Playground
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main playground UI ───────────────────────────────────────────────────

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
          <button
            onClick={handleChangeCode}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Lock className="h-3 w-3" />
            Change Code
          </button>
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
            availableCollectors={availableCollectors}
            selectedCollectors={selectedCollectors}
            collectorCounts={collectorCounts}
            onToggleCollector={toggleCollector}
            onCollectorCountChange={setCollectorCount}
            providers={providers}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            onProviderChange={(p) => {
              setSelectedProvider(p);
              if (accessCode) trackPlaygroundProviderChange(accessCode, p, selectedModel);
            }}
            onModelChange={setSelectedModel}
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
          executionLogs={executionLogs}
        />
      )}
    </div>
  );
}
