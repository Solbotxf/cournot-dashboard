"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import { Sparkles, Search, Brain, Scale, ChevronRight, Info, AlertTriangle, ExternalLink, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import type { ParseResult } from "@/lib/types";
import type {
  ResolutionArtifacts,
  DisputeResponse,
  DisputeReasonCode,
  DisputeTargetArtifact,
} from "@/components/playground/dispute-panel";
import { DisputeDiff } from "@/components/playground/dispute-diff";

// ─── Pipeline step configuration ────────────────────────────────────────────

type StepId = "prompt_spec" | "evidence" | "reasoning" | "verdict";

interface StepConfig {
  id: StepId;
  label: string;
  description: string;
  icon: typeof Sparkles;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  defaultTarget: DisputeTargetArtifact;
  defaultMode: "full_rerun" | "reasoning_only";
  defaultReason: DisputeReasonCode;
}

const PIPELINE_STEPS: StepConfig[] = [
  {
    id: "prompt_spec",
    label: "Prompt Spec",
    description: "Market specification compiled from input",
    icon: Sparkles,
    accentBorder: "border-l-violet-500",
    accentBg: "bg-violet-500/10",
    accentText: "text-violet-400",
    defaultTarget: "prompt_spec",
    defaultMode: "full_rerun",
    defaultReason: "OTHER",
  },
  {
    id: "evidence",
    label: "Evidence Collection",
    description: "Evidence gathered from configured sources",
    icon: Search,
    accentBorder: "border-l-emerald-500",
    accentBg: "bg-emerald-500/10",
    accentText: "text-emerald-400",
    defaultTarget: "evidence_bundle",
    defaultMode: "full_rerun",
    defaultReason: "EVIDENCE_INSUFFICIENT",
  },
  {
    id: "reasoning",
    label: "Reasoning & Audit",
    description: "Step-by-step reasoning trace and analysis",
    icon: Brain,
    accentBorder: "border-l-sky-500",
    accentBg: "bg-sky-500/10",
    accentText: "text-sky-400",
    defaultTarget: "reasoning_trace",
    defaultMode: "reasoning_only",
    defaultReason: "REASONING_ERROR",
  },
  {
    id: "verdict",
    label: "Verdict & Judge",
    description: "Final outcome determination",
    icon: Scale,
    accentBorder: "border-l-amber-500",
    accentBg: "bg-amber-500/10",
    accentText: "text-amber-400",
    defaultTarget: "verdict",
    defaultMode: "reasoning_only",
    defaultReason: "REASONING_ERROR",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function safeJson(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

// ─── PipelineStepsView (container) ──────────────────────────────────────────

interface PipelineStepsViewProps {
  artifacts: ResolutionArtifacts;
  resolveResult: any;
  promptResult: ParseResult;
  onSubmitDispute: (payload: any) => Promise<DisputeResponse>;
}

export function PipelineStepsView({
  artifacts,
  resolveResult,
  promptResult,
  onSubmitDispute,
}: PipelineStepsViewProps) {
  const [disputeResults, setDisputeResults] = useState<
    Record<string, DisputeResponse>
  >({});

  function handleStepDisputeResult(stepId: string, result: DisputeResponse) {
    setDisputeResults((prev) => ({ ...prev, [stepId]: result }));
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
        Resolution Pipeline
      </h3>
      <div className="space-y-3">
        {PIPELINE_STEPS.map((config, idx) => (
          <StepCard
            key={config.id}
            stepNumber={idx + 1}
            config={config}
            artifacts={artifacts}
            resolveResult={resolveResult}
            promptResult={promptResult}
            disputeResult={disputeResults[config.id] ?? null}
            onSubmitDispute={onSubmitDispute}
            onDisputeResult={(res) =>
              handleStepDisputeResult(config.id, res)
            }
          />
        ))}
      </div>
    </div>
  );
}

// ─── StepCard ───────────────────────────────────────────────────────────────

interface StepCardProps {
  stepNumber: number;
  config: StepConfig;
  artifacts: ResolutionArtifacts;
  resolveResult: any;
  promptResult: ParseResult;
  disputeResult: DisputeResponse | null;
  onSubmitDispute: (payload: any) => Promise<DisputeResponse>;
  onDisputeResult: (result: DisputeResponse) => void;
}

function StepCard({
  stepNumber,
  config,
  artifacts,
  resolveResult,
  promptResult,
  disputeResult,
  onSubmitDispute,
  onDisputeResult,
}: StepCardProps) {
  const Icon = config.icon;

  return (
    <Card className={cn("border-border/50 border-l-4", config.accentBorder)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-md",
                config.accentBg
              )}
            >
              <Icon className={cn("w-4 h-4", config.accentText)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {stepNumber}.
                </span>
                <span className="text-sm font-semibold">{config.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>
          <StepDisputeDialog
            config={config}
            artifacts={artifacts}
            promptResult={promptResult}
            onSubmitDispute={onSubmitDispute}
            onDisputeResult={onDisputeResult}
          />
        </div>

        {/* Step-specific body */}
        <StepBody
          stepId={config.id}
          artifacts={artifacts}
          resolveResult={resolveResult}
          promptResult={promptResult}
        />

        {/* Inline dispute diff */}
        {disputeResult && (
          <div className="pt-2 border-t border-border/30">
            <DisputeDiff
              beforeVerdict={artifacts.verdict}
              afterVerdict={disputeResult.artifacts?.verdict}
              beforeReasoning={artifacts.reasoning_trace}
              afterReasoning={disputeResult.artifacts?.reasoning_trace}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── StepBody (step-specific content) ───────────────────────────────────────

function StepBody({
  stepId,
  artifacts,
  resolveResult,
  promptResult,
}: {
  stepId: StepId;
  artifacts: ResolutionArtifacts;
  resolveResult: any;
  promptResult: ParseResult;
}) {
  const spec = artifacts.prompt_spec ?? promptResult.prompt_spec;

  switch (stepId) {
    case "prompt_spec":
      return <PromptSpecBody spec={spec} />;
    case "evidence":
      return (
        <EvidenceBody
          bundles={artifacts.evidence_bundles}
          summary={resolveResult?.evidence_summary}
        />
      );
    case "reasoning":
      return (
        <ReasoningBody
          reasoning={artifacts.reasoning_trace}
          summary={resolveResult?.reasoning_summary}
          steps={resolveResult?.reasoning_steps}
        />
      );
    case "verdict":
      return (
        <VerdictBody
          verdict={artifacts.verdict}
          resolveResult={resolveResult}
        />
      );
    default:
      return null;
  }
}

// ─── Prompt Spec Body ───────────────────────────────────────────────────────

function PromptSpecBody({ spec }: { spec: any }) {
  const [showRaw, setShowRaw] = useState(false);

  if (!spec) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No prompt spec available
      </p>
    );
  }

  const question = spec.market?.question ?? "(unknown)";
  const schemaVersion = spec.schema_version ?? "?";
  const taskType = spec.task_type ?? "?";
  const dataReqCount = spec.data_requirements?.length ?? 0;
  const ruleCount = spec.market?.resolution_rules?.length ?? 0;
  const forbidden = spec.forbidden_behaviors ?? [];

  return (
    <div className="space-y-2">
      <div className="rounded-md bg-muted/20 p-2.5">
        <p className="text-xs text-muted-foreground">Question</p>
        <p className="text-sm">{question}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <span>
          <span className="text-muted-foreground">Schema:</span>{" "}
          <span className="font-mono">{schemaVersion}</span>
        </span>
        <span className="text-border">|</span>
        <span>
          <span className="text-muted-foreground">Type:</span> {taskType}
        </span>
        <span className="text-border">|</span>
        <span>
          <span className="text-muted-foreground">Data Reqs:</span>{" "}
          {dataReqCount}
        </span>
        <span className="text-border">|</span>
        <span>
          <span className="text-muted-foreground">Resolution Rules:</span>{" "}
          {ruleCount}
        </span>
      </div>
      {forbidden.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {forbidden.map((f: string) => (
            <Badge
              key={f}
              variant="outline"
              className="text-[10px] font-mono"
            >
              {f}
            </Badge>
          ))}
        </div>
      )}
      <button
        onClick={() => setShowRaw(!showRaw)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight
          className={cn(
            "w-3 h-3 transition-transform",
            showRaw && "rotate-90"
          )}
        />
        View raw prompt_spec JSON
      </button>
      {showRaw && (
        <pre className="text-xs whitespace-pre-wrap bg-muted/10 rounded-md p-2 max-h-60 overflow-auto">
          {safeJson(spec)}
        </pre>
      )}
    </div>
  );
}

// ─── Evidence Body ──────────────────────────────────────────────────────────

function EvidenceBody({
  bundles,
  summary,
}: {
  bundles: any[];
  summary?: string;
}) {
  const [expandedBundles, setExpandedBundles] = useState<
    Record<number, boolean>
  >({});
  const [expandedItems, setExpandedItems] = useState<
    Record<string, boolean>
  >({});

  if (!bundles || bundles.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No evidence bundles
      </p>
    );
  }

  const totalItems = bundles.reduce(
    (sum: number, b: any) => sum + (b?.items?.length ?? 0),
    0
  );

  function toggleBundle(idx: number) {
    setExpandedBundles((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  function toggleItem(key: string) {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-2">
      {summary && (
        <div className="rounded-md bg-muted/20 p-2.5">
          <p className="text-xs text-muted-foreground">Summary</p>
          <p className="text-sm">{summary}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {totalItems} total items across {bundles.length} bundle
        {bundles.length !== 1 ? "s" : ""}
      </p>

      <div className="space-y-1.5">
        {bundles.map((b: any, idx: number) => {
          const isOpen = !!expandedBundles[idx];
          const items: any[] = b?.items ?? [];
          return (
            <div
              key={b?.bundle_id ?? idx}
              className="rounded-md border border-border/30 overflow-hidden"
            >
              {/* Bundle header */}
              <button
                onClick={() => toggleBundle(idx)}
                className="flex items-center gap-2 w-full text-left text-xs px-2.5 py-2 hover:bg-muted/20 transition-colors"
              >
                <ChevronRight
                  className={cn(
                    "w-3 h-3 shrink-0 transition-transform text-muted-foreground",
                    isOpen && "rotate-90"
                  )}
                />
                <Badge variant="outline" className="text-[10px] font-mono">
                  {b?.collector_name ?? `bundle-${idx}`}
                </Badge>
                <span>{items.length} items</span>
                {b?.execution_time_ms != null && (
                  <span className="text-muted-foreground">
                    {b.execution_time_ms}ms
                  </span>
                )}
                {b?.weight != null && (
                  <span className="text-muted-foreground ml-auto">
                    weight: {b.weight}
                  </span>
                )}
              </button>

              {/* Expanded items */}
              {isOpen && (
                <div className="border-t border-border/20">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-2.5 py-2">
                      No items in this bundle
                    </p>
                  ) : (
                    items.map((item: any, itemIdx: number) => {
                      const itemKey = `${idx}-${itemIdx}`;
                      const itemOpen = !!expandedItems[itemKey];
                      const hasError =
                        item?.error || item?.success === false;
                      const extracted = item?.extracted_fields;
                      const evidenceSources =
                        extracted?.evidence_sources ?? [];

                      return (
                        <div
                          key={item?.evidence_id ?? itemIdx}
                          className={cn(
                            "border-t border-border/10",
                            itemIdx === 0 && "border-t-0"
                          )}
                        >
                          {/* Item header */}
                          <button
                            onClick={() => toggleItem(itemKey)}
                            className="flex items-center gap-2 w-full text-left text-xs px-4 py-1.5 hover:bg-muted/10 transition-colors"
                          >
                            <ChevronRight
                              className={cn(
                                "w-3 h-3 shrink-0 transition-transform text-muted-foreground",
                                itemOpen && "rotate-90"
                              )}
                            />
                            {hasError ? (
                              <XCircle className="w-3 h-3 shrink-0 text-red-400" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                            )}
                            <span className="truncate font-medium">
                              {item?.source_name || item?.evidence_id || `Item ${itemIdx}`}
                            </span>
                            {item?.tier != null && (
                              <Badge
                                variant="outline"
                                className="text-[9px] shrink-0"
                              >
                                Tier {item.tier}
                              </Badge>
                            )}
                            {extracted?.confidence_score != null && (
                              <span className="ml-auto text-muted-foreground font-mono shrink-0">
                                {Math.round(
                                  extracted.confidence_score * 100
                                )}
                                %
                              </span>
                            )}
                          </button>

                          {/* Item detail */}
                          {itemOpen && (
                            <div className="px-4 pb-2.5 pt-1 space-y-2 text-xs">
                              {/* URL */}
                              {item?.source_uri && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-muted-foreground shrink-0">
                                    URL:
                                  </span>
                                  <a
                                    href={item.source_uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline truncate flex items-center gap-1"
                                  >
                                    {item.source_uri}
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                </div>
                              )}

                              {/* Excerpt */}
                              {item?.parsed_excerpt && (
                                <div>
                                  <p className="text-muted-foreground mb-0.5">
                                    Excerpt:
                                  </p>
                                  <p className="rounded bg-muted/15 p-2 leading-relaxed whitespace-pre-wrap">
                                    {item.parsed_excerpt}
                                  </p>
                                </div>
                              )}

                              {/* Error */}
                              {item?.error && (
                                <div className="rounded bg-red-500/10 border border-red-500/20 p-2 text-red-400">
                                  Error: {item.error}
                                </div>
                              )}

                              {/* Extracted fields */}
                              {extracted && (
                                <div className="space-y-1.5">
                                  <p className="text-muted-foreground font-medium">
                                    Extracted fields:
                                  </p>

                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                    {extracted.resolution_status && (
                                      <span>
                                        <span className="text-muted-foreground">
                                          Resolution:
                                        </span>{" "}
                                        {extracted.resolution_status}
                                      </span>
                                    )}
                                    {extracted.hypothesis_match && (
                                      <span>
                                        <span className="text-muted-foreground">
                                          Hypothesis match:
                                        </span>{" "}
                                        {extracted.hypothesis_match}
                                      </span>
                                    )}
                                    {extracted.confidence_score != null && (
                                      <span>
                                        <span className="text-muted-foreground">
                                          Confidence:
                                        </span>{" "}
                                        <span className="font-mono">
                                          {extracted.confidence_score}
                                        </span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Discrepancies */}
                                  {extracted.discrepancies &&
                                    extracted.discrepancies.length > 0 && (
                                      <div>
                                        <p className="text-muted-foreground text-[11px]">
                                          Discrepancies:
                                        </p>
                                        <ul className="list-disc list-inside text-[11px] text-red-400/80 ml-1">
                                          {extracted.discrepancies.map(
                                            (d: string, i: number) => (
                                              <li key={i}>{d}</li>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    )}

                                  {/* Conflicts */}
                                  {extracted.conflicts &&
                                    extracted.conflicts.length > 0 && (
                                      <div>
                                        <p className="text-muted-foreground text-[11px]">
                                          Conflicts:
                                        </p>
                                        <ul className="list-disc list-inside text-[11px] text-amber-400/80 ml-1">
                                          {extracted.conflicts.map(
                                            (c: string, i: number) => (
                                              <li key={i}>{c}</li>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    )}

                                  {/* Missing info */}
                                  {extracted.missing_info &&
                                    extracted.missing_info.length > 0 && (
                                      <div>
                                        <p className="text-muted-foreground text-[11px]">
                                          Missing info:
                                        </p>
                                        <ul className="list-disc list-inside text-[11px] text-muted-foreground ml-1">
                                          {extracted.missing_info.map(
                                            (m: string, i: number) => (
                                              <li key={i}>{m}</li>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    )}

                                  {/* Evidence sources within extracted fields */}
                                  {evidenceSources.length > 0 && (
                                    <div>
                                      <p className="text-muted-foreground text-[11px] font-medium">
                                        Source citations (
                                        {evidenceSources.length}):
                                      </p>
                                      <div className="space-y-1 mt-1">
                                        {evidenceSources.map(
                                          (src: any, si: number) => (
                                            <div
                                              key={si}
                                              className="rounded bg-muted/10 p-1.5 text-[11px] flex items-start gap-2"
                                            >
                                              {src.supports === "YES" ? (
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                                              ) : src.supports === "NO" ? (
                                                <XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                                              ) : (
                                                <MinusCircle className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                                              )}
                                              <div className="min-w-0">
                                                <p className="font-medium">
                                                  {src.key_fact}
                                                </p>
                                                {src.url && (
                                                  <a
                                                    href={src.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:underline truncate block flex items-center gap-1"
                                                  >
                                                    {src.url}
                                                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                                  </a>
                                                )}
                                                <div className="flex gap-2 text-muted-foreground mt-0.5">
                                                  <span>
                                                    Tier{" "}
                                                    {src.credibility_tier}
                                                  </span>
                                                  {src.supports && (
                                                    <span>
                                                      Supports:{" "}
                                                      <span
                                                        className={
                                                          src.supports ===
                                                          "YES"
                                                            ? "text-emerald-400"
                                                            : src.supports ===
                                                                "NO"
                                                              ? "text-red-400"
                                                              : ""
                                                        }
                                                      >
                                                        {src.supports}
                                                      </span>
                                                    </span>
                                                  )}
                                                  {src.date_published && (
                                                    <span>
                                                      {src.date_published}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Metadata row */}
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground pt-1 border-t border-border/10">
                                {item?.evidence_id && (
                                  <span className="font-mono">
                                    id: {item.evidence_id}
                                  </span>
                                )}
                                {item?.fetched_at && (
                                  <span>
                                    fetched:{" "}
                                    {new Date(
                                      item.fetched_at
                                    ).toLocaleString()}
                                  </span>
                                )}
                                {item?.status_code != null && (
                                  <span>
                                    HTTP {item.status_code}
                                  </span>
                                )}
                                {item?.content_hash && (
                                  <span className="font-mono truncate max-w-[140px]">
                                    hash: {item.content_hash}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reasoning Body ─────────────────────────────────────────────────────────

function ReasoningBody({
  reasoning,
  summary,
  steps,
}: {
  reasoning: any;
  summary?: string;
  steps?: any[];
}) {
  const [expandedSteps, setExpandedSteps] = useState<
    Record<number, boolean>
  >({});
  const [showRawTrace, setShowRawTrace] = useState(false);

  const displaySummary =
    summary ?? reasoning?.reasoning_summary ?? null;
  const displaySteps = steps ?? reasoning?.reasoning_steps ?? [];

  const stepIcons = ["\u2460", "\u2461", "\u2462", "\u2463", "\u2464", "\u2465"];

  const STEP_TYPE_LABELS: Record<string, string> = {
    validity_check: "Validity Check",
    evidence_analysis: "Evidence Analysis",
    rule_application: "Rule Application",
    confidence_assessment: "Confidence Assessment",
  };

  function toggleStep(idx: number) {
    setExpandedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  return (
    <div className="space-y-2">
      {displaySummary && (
        <div className="rounded-md bg-muted/20 p-2.5">
          <p className="text-xs text-muted-foreground">Summary</p>
          <p className="text-sm">{displaySummary}</p>
        </div>
      )}
      {displaySteps.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Steps ({displaySteps.length}):
          </p>
          {displaySteps.map((s: any, idx: number) => {
            const isOpen = !!expandedSteps[idx];
            const stepType = s?.step_type ?? "step";
            return (
              <div
                key={s?.step_id ?? idx}
                className="rounded-md border border-border/30 overflow-hidden"
              >
                <button
                  onClick={() => toggleStep(idx)}
                  className="flex items-start gap-2 w-full text-left text-xs px-2.5 py-1.5 hover:bg-muted/10 transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "w-3 h-3 mt-0.5 shrink-0 transition-transform text-muted-foreground",
                      isOpen && "rotate-90"
                    )}
                  />
                  <span className="text-muted-foreground shrink-0">
                    {stepIcons[idx] ?? `${idx + 1}.`}
                  </span>
                  <span className="font-mono text-muted-foreground shrink-0">
                    {STEP_TYPE_LABELS[stepType] ?? stepType}
                  </span>
                  <span className="text-foreground/80 truncate">
                    {s?.conclusion ?? s?.description ?? ""}
                  </span>
                  {s?.confidence_delta != null && (
                    <span
                      className={cn(
                        "shrink-0 font-mono ml-auto",
                        s.confidence_delta > 0
                          ? "text-emerald-400"
                          : s.confidence_delta < 0
                            ? "text-red-400"
                            : "text-muted-foreground"
                      )}
                    >
                      {s.confidence_delta > 0 ? "+" : ""}
                      {s.confidence_delta}
                    </span>
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-2.5 pt-1 space-y-2 text-xs border-t border-border/10">
                    {/* Description */}
                    {s?.description && (
                      <div>
                        <p className="text-muted-foreground mb-0.5">
                          Description:
                        </p>
                        <p className="leading-relaxed">{s.description}</p>
                      </div>
                    )}
                    {/* Conclusion */}
                    {s?.conclusion && (
                      <div>
                        <p className="text-muted-foreground mb-0.5">
                          Conclusion:
                        </p>
                        <p className="leading-relaxed rounded bg-muted/15 p-2">
                          {s.conclusion}
                        </p>
                      </div>
                    )}
                    {/* Confidence delta */}
                    {s?.confidence_delta != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Confidence impact:
                        </span>
                        <span
                          className={cn(
                            "font-mono font-medium",
                            s.confidence_delta > 0
                              ? "text-emerald-400"
                              : s.confidence_delta < 0
                                ? "text-red-400"
                                : "text-muted-foreground"
                          )}
                        >
                          {s.confidence_delta > 0 ? "+" : ""}
                          {s.confidence_delta}
                        </span>
                      </div>
                    )}
                    {/* Dependencies */}
                    {s?.depends_on && s.depends_on.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Depends on:
                        </span>
                        <div className="flex gap-1">
                          {s.depends_on.map((dep: string) => (
                            <Badge
                              key={dep}
                              variant="outline"
                              className="text-[9px] font-mono"
                            >
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Step ID */}
                    {s?.step_id && (
                      <p className="text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/10">
                        id: {s.step_id}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!displaySummary && displaySteps.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No reasoning data available
        </p>
      )}

      {/* Raw reasoning trace toggle */}
      {reasoning && (
        <>
          <button
            onClick={() => setShowRawTrace(!showRawTrace)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight
              className={cn(
                "w-3 h-3 transition-transform",
                showRawTrace && "rotate-90"
              )}
            />
            View raw reasoning_trace JSON
          </button>
          {showRawTrace && (
            <pre className="text-xs whitespace-pre-wrap bg-muted/10 rounded-md p-2 max-h-60 overflow-auto">
              {safeJson(reasoning)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

// ─── Verdict Body ───────────────────────────────────────────────────────────

function VerdictBody({
  verdict,
  resolveResult,
}: {
  verdict: any;
  resolveResult: any;
}) {
  const [showRawVerdict, setShowRawVerdict] = useState(false);
  const [showReviewDetail, setShowReviewDetail] = useState(false);

  const outcome = verdict?.outcome ?? resolveResult?.outcome ?? "?";
  const confidence =
    verdict?.confidence ?? resolveResult?.confidence ?? null;
  const verificationOk = resolveResult?.verification_ok;
  const justification =
    verdict?.justification ??
    resolveResult?.justification ??
    null;
  const breakdown =
    verdict?.confidence_breakdown ??
    resolveResult?.confidence_breakdown ??
    null;
  const llmReview =
    verdict?.llm_review ?? resolveResult?.llm_review ?? null;

  const confPct =
    confidence != null ? Math.round(confidence * 100) : null;

  return (
    <div className="space-y-2">
      {/* Outcome + confidence row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Outcome:</span>
          <Badge
            variant="outline"
            className={cn(
              "font-mono",
              outcome === "YES"
                ? "border-emerald-500/50 text-emerald-400"
                : outcome === "NO"
                  ? "border-red-500/50 text-red-400"
                  : ""
            )}
          >
            {String(outcome)}
          </Badge>
        </div>
        {confPct != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${confPct}%` }}
                />
              </div>
              <span className="text-xs font-mono">{confPct}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Verification */}
      {verificationOk != null && (
        <p className="text-xs">
          {verificationOk ? (
            <span className="text-emerald-400">
              &#10003; Verification passed
            </span>
          ) : (
            <span className="text-red-400">
              &#10007; Verification failed
            </span>
          )}
        </p>
      )}

      {/* Justification */}
      {justification && (
        <div className="rounded-md bg-muted/20 p-2.5">
          <p className="text-xs text-muted-foreground">Justification</p>
          <p className="text-sm">{justification}</p>
        </div>
      )}

      {/* LLM Review (expandable) */}
      {llmReview && (
        <div className="rounded-md border border-border/30 overflow-hidden">
          <button
            onClick={() => setShowReviewDetail(!showReviewDetail)}
            className="flex items-center gap-2 w-full text-left text-xs px-2.5 py-2 hover:bg-muted/10 transition-colors"
          >
            <ChevronRight
              className={cn(
                "w-3 h-3 shrink-0 transition-transform text-muted-foreground",
                showReviewDetail && "rotate-90"
              )}
            />
            <span className="text-muted-foreground">LLM Review</span>
            {llmReview.reasoning_valid != null && (
              <span className="ml-1">
                {llmReview.reasoning_valid ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-400 inline" />
                )}
              </span>
            )}
            {llmReview.issues && llmReview.issues.length > 0 && (
              <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/30 ml-auto">
                {llmReview.issues.length} issue{llmReview.issues.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </button>
          {showReviewDetail && (
            <div className="px-4 pb-2.5 pt-1 space-y-2 text-xs border-t border-border/10">
              {llmReview.final_justification && (
                <div>
                  <p className="text-muted-foreground mb-0.5">Final justification:</p>
                  <p className="leading-relaxed rounded bg-muted/15 p-2">
                    {llmReview.final_justification}
                  </p>
                </div>
              )}
              {llmReview.reasoning_valid != null && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Reasoning valid:</span>
                  {llmReview.reasoning_valid ? (
                    <span className="text-emerald-400">Yes</span>
                  ) : (
                    <span className="text-red-400">No</span>
                  )}
                </div>
              )}
              {llmReview.issues && llmReview.issues.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-0.5">Issues found:</p>
                  <ul className="list-disc list-inside text-red-400/80 ml-1 space-y-0.5">
                    {llmReview.issues.map((issue: string, i: number) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {llmReview.confidence_adjustments && llmReview.confidence_adjustments.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-0.5">Review confidence adjustments:</p>
                  <div className="space-y-0.5">
                    {llmReview.confidence_adjustments.map((adj: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-mono",
                            adj.delta > 0
                              ? "text-emerald-400"
                              : adj.delta < 0
                                ? "text-red-400"
                                : "text-muted-foreground"
                          )}
                        >
                          {adj.delta > 0 ? "+" : ""}{adj.delta}
                        </span>
                        <span className="text-muted-foreground">{adj.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confidence breakdown */}
      {breakdown && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Confidence Breakdown:
          </p>
          <div className="rounded-md border border-border/30 p-2.5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Base:</span>
              <span className="font-mono">{breakdown.base}</span>
            </div>
            {(breakdown.adjustments ?? []).length > 0 && (
              <div className="space-y-0.5">
                {(breakdown.adjustments ?? []).map(
                  (adj: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span
                        className={cn(
                          "font-mono w-12 text-right",
                          adj.delta > 0
                            ? "text-emerald-400"
                            : adj.delta < 0
                              ? "text-red-400"
                              : "text-muted-foreground"
                        )}
                      >
                        {adj.delta > 0 ? "+" : ""}
                        {adj.delta}
                      </span>
                      <span className="text-muted-foreground">
                        {adj.reason}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
            {breakdown.final != null && (
              <div className="flex items-center gap-2 text-xs pt-1 border-t border-border/10">
                <span className="text-muted-foreground">Final:</span>
                <span className="font-mono font-medium">{breakdown.final}</span>
              </div>
            )}
          </div>
          {llmReview?.issues && llmReview.issues.length > 0 ? (
            <p className="text-xs text-red-400">
              Issues: {llmReview.issues.join("; ")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Issues: (none)</p>
          )}
        </div>
      )}

      {/* Raw verdict JSON toggle */}
      {verdict && (
        <>
          <button
            onClick={() => setShowRawVerdict(!showRawVerdict)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight
              className={cn(
                "w-3 h-3 transition-transform",
                showRawVerdict && "rotate-90"
              )}
            />
            View raw verdict JSON
          </button>
          {showRawVerdict && (
            <pre className="text-xs whitespace-pre-wrap bg-muted/10 rounded-md p-2 max-h-60 overflow-auto">
              {safeJson(verdict)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

// ─── StepDisputeDialog ──────────────────────────────────────────────────────

const REASON_CODE_OPTIONS: {
  value: DisputeReasonCode;
  label: string;
  description: string;
}[] = [
  {
    value: "REASONING_ERROR",
    label: "Reasoning Error",
    description: "The logic or analysis contains a mistake",
  },
  {
    value: "LOGIC_GAP",
    label: "Logic Gap",
    description: "A step in the reasoning is missing or skipped",
  },
  {
    value: "EVIDENCE_MISREAD",
    label: "Evidence Misread",
    description: "Evidence was interpreted incorrectly",
  },
  {
    value: "EVIDENCE_INSUFFICIENT",
    label: "Insufficient Evidence",
    description: "Not enough evidence was gathered to support the conclusion",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "A different issue not covered above",
  },
];

const TARGET_ARTIFACT_OPTIONS: {
  value: DisputeTargetArtifact;
  label: string;
  description: string;
}[] = [
  {
    value: "prompt_spec",
    label: "Prompt Spec",
    description: "The market question definition and rules",
  },
  {
    value: "evidence_bundle",
    label: "Evidence Bundle",
    description: "The collected evidence data",
  },
  {
    value: "reasoning_trace",
    label: "Reasoning Trace",
    description: "The step-by-step analysis and logic",
  },
  {
    value: "verdict",
    label: "Verdict",
    description: "The final outcome and confidence score",
  },
];

const STEP_MESSAGE_PLACEHOLDERS: Record<StepId, string> = {
  prompt_spec:
    'e.g. "The question was misinterpreted — it asks about X, not Y. The resolution deadline should be..."',
  evidence:
    'e.g. "The collector missed a critical source at [URL]. The existing evidence from [source] contradicts the conclusion because..."',
  reasoning:
    'e.g. "Step 2 (evidence_analysis) incorrectly concluded X. The evidence actually shows Y because..."',
  verdict:
    'e.g. "The confidence is too high given the conflicting evidence. The outcome should be NO because..."',
};

const STEP_CONTEXT_DESCRIPTIONS: Record<StepId, string> = {
  prompt_spec:
    "This will re-run the entire pipeline from scratch with a modified market specification. Use this when the question, rules, or constraints were wrong.",
  evidence:
    "This will re-collect evidence from sources and re-run reasoning. Use this when evidence was missing, incomplete, or from wrong sources.",
  reasoning:
    "This will re-run only the reasoning and verdict steps using existing evidence. Use this when the analysis drew wrong conclusions from correct data.",
  verdict:
    "This will re-run only the verdict step using existing reasoning. Use this when the final judgment or confidence score doesn't match the analysis.",
};

interface StepDisputeDialogProps {
  config: StepConfig;
  artifacts: ResolutionArtifacts;
  promptResult: ParseResult;
  onSubmitDispute: (payload: any) => Promise<DisputeResponse>;
  onDisputeResult: (result: DisputeResponse) => void;
}

function StepDisputeDialog({
  config,
  artifacts,
  promptResult,
  onSubmitDispute,
  onDisputeResult,
}: StepDisputeDialogProps) {
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<DisputeReasonCode>(
    config.defaultReason
  );
  const [targetArtifact, setTargetArtifact] =
    useState<DisputeTargetArtifact>(config.defaultTarget);
  const [message, setMessage] = useState("");
  const [leafPath, setLeafPath] = useState("");
  const [bundleIndex, setBundleIndex] = useState(0);
  const [rerunCollect, setRerunCollect] = useState(
    config.defaultMode === "full_rerun"
  );
  const [appendItemsJson, setAppendItemsJson] = useState("[]");
  const [promptSpecOverrideJson, setPromptSpecOverrideJson] = useState(
    () => {
      if (config.id === "prompt_spec") {
        try {
          return JSON.stringify(
            artifacts.prompt_spec ?? promptResult.prompt_spec ?? {},
            null,
            2
          );
        } catch {
          return "{}";
        }
      }
      return "{}";
    }
  );
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const bundleOptions = useMemo(() => {
    return (artifacts.evidence_bundles ?? []).map((b: any, idx: number) => ({
      idx,
      label: b?.collector_name
        ? `${b.collector_name} (${b?.items?.length ?? 0} items)`
        : `Bundle ${idx} (${b?.items?.length ?? 0} items)`,
    }));
  }, [artifacts.evidence_bundles]);

  const selectedEvidenceBundle = useMemo(() => {
    const bundles = artifacts.evidence_bundles ?? [];
    return (
      bundles[Math.max(0, Math.min(bundleIndex, bundles.length - 1))] ?? null
    );
  }, [artifacts.evidence_bundles, bundleIndex]);

  const needsBundleSelector =
    config.id === "evidence" ||
    config.id === "reasoning" ||
    config.id === "verdict";

  const canFullRerun =
    !!artifacts.tool_plan &&
    !!artifacts.collectors_used &&
    artifacts.collectors_used.length > 0;

  const currentReasonMeta = REASON_CODE_OPTIONS.find(
    (r) => r.value === reasonCode
  );

  async function handleSubmit() {
    if (!message.trim()) {
      toast.error("Please enter a dispute message");
      return;
    }

    const effectiveRerunCollect =
      config.id === "prompt_spec" ? true : rerunCollect;

    if (!effectiveRerunCollect && !selectedEvidenceBundle) {
      toast.error("No evidence bundle available");
      return;
    }

    let evidenceItemsAppend: any[] | null = null;
    try {
      const parsed = JSON.parse(appendItemsJson || "[]");
      if (!Array.isArray(parsed)) {
        throw new Error("append items JSON must be an array");
      }
      evidenceItemsAppend = parsed;
    } catch (e) {
      toast.error("Invalid evidence append JSON", {
        description: e instanceof Error ? e.message : "Expected JSON array",
      });
      return;
    }

    let promptSpecOverride: Record<string, any> | null = null;
    try {
      const parsed = JSON.parse(promptSpecOverrideJson || "{}");
      if (
        parsed == null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error("prompt_spec_override must be a JSON object");
      }
      promptSpecOverride = parsed;
    } catch (e) {
      toast.error("Invalid PromptSpec override JSON", {
        description: e instanceof Error ? e.message : "Expected JSON object",
      });
      return;
    }

    const payload = {
      mode: effectiveRerunCollect ? "full_rerun" : "reasoning_only",
      case_id: null,
      reason_code: reasonCode,
      message: message.trim(),
      target: {
        artifact: targetArtifact,
        leaf_path: leafPath.trim() || null,
      },
      prompt_spec: artifacts.prompt_spec,
      evidence_bundle: effectiveRerunCollect
        ? null
        : selectedEvidenceBundle,
      reasoning_trace: effectiveRerunCollect
        ? null
        : targetArtifact === "verdict" ||
            targetArtifact === "reasoning_trace"
          ? artifacts.reasoning_trace
          : null,
      tool_plan: effectiveRerunCollect
        ? (artifacts.tool_plan ?? null)
        : null,
      collectors: effectiveRerunCollect
        ? (artifacts.collectors_used ?? null)
        : null,
      patch:
        (evidenceItemsAppend && evidenceItemsAppend.length > 0) ||
        (promptSpecOverride && Object.keys(promptSpecOverride).length > 0)
          ? {
              ...(evidenceItemsAppend && evidenceItemsAppend.length > 0
                ? { evidence_items_append: evidenceItemsAppend }
                : {}),
              ...(promptSpecOverride &&
              Object.keys(promptSpecOverride).length > 0
                ? { prompt_spec_override: promptSpecOverride }
                : {}),
            }
          : null,
    };

    setSubmitting(true);
    try {
      const res = await onSubmitDispute(payload);
      toast.success("Dispute submitted", {
        description: `Reran: ${res.rerun_plan?.join(", ") || "(unknown)"}`,
      });
      onDisputeResult(res);
      setOpen(false);
    } catch (e) {
      toast.error("Dispute failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const modeLabel = (() => {
    if (config.id === "prompt_spec") return "Full pipeline rerun";
    if (rerunCollect) return "Full pipeline rerun (collect + reason + judge)";
    return "Reasoning-only rerun (skip evidence collection)";
  })();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            "border border-border/50 hover:bg-muted/30 text-muted-foreground hover:text-foreground"
          )}
        >
          Dispute
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <config.icon className={cn("w-4 h-4", config.accentText)} />
            Dispute: {config.label}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Challenge the {config.label} pipeline step
          </DialogDescription>
        </DialogHeader>

        {/* Context banner */}
        <div className={cn("rounded-md p-3 text-xs space-y-1", config.accentBg)}>
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground leading-relaxed">
              {STEP_CONTEXT_DESCRIPTIONS[config.id]}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* ── Section 1: Your dispute ─────────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              What went wrong?
            </p>

            {/* Message - most important, so it's first */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Describe the issue <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder={STEP_MESSAGE_PLACEHOLDERS[config.id]}
              />
              <p className="text-[11px] text-muted-foreground">
                Be specific about what is wrong and what the correct answer
                should be. This helps the system understand what to fix.
              </p>
            </div>

            {/* Reason code */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Why is this wrong?
              </label>
              <Select
                value={reasonCode}
                onValueChange={(v) =>
                  setReasonCode(v as DisputeReasonCode)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASON_CODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span>{opt.label}</span>
                        <span className="text-muted-foreground">
                          - {opt.description}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentReasonMeta && (
                <p className="text-[11px] text-muted-foreground">
                  {currentReasonMeta.description}
                </p>
              )}
            </div>
          </div>

          {/* ── Section 2: Rerun strategy ──────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              How should the system re-run?
            </p>

            {/* Rerun toggle */}
            {config.id !== "prompt_spec" ? (
              <div className="rounded-md border border-border/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">
                      Re-collect evidence from sources
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {config.id === "evidence"
                        ? "Always on for the evidence step -- evidence will be re-gathered from all collectors."
                        : rerunCollect
                          ? "ON: The system will fetch fresh evidence, then re-reason and re-judge."
                          : "OFF: The system will reuse existing evidence and only re-run reasoning and judgment."}
                    </p>
                  </div>
                  <Switch
                    checked={rerunCollect}
                    onCheckedChange={setRerunCollect}
                    disabled={config.id === "evidence"}
                  />
                </div>
                {rerunCollect && !canFullRerun && (
                  <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    Cannot re-collect: this run is missing tool_plan or
                    collectors configuration.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Disputing the prompt spec always triggers a full pipeline
                  rerun (collect + reason + judge) since everything
                  downstream depends on it.
                </p>
              </div>
            )}

            {/* Bundle selector */}
            {needsBundleSelector && bundleOptions.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  Evidence bundle to use
                </label>
                <Select
                  value={String(bundleIndex)}
                  onValueChange={(v) => setBundleIndex(parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bundleOptions.map(
                      (o: { idx: number; label: string }) => (
                        <SelectItem key={o.idx} value={String(o.idx)}>
                          {o.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {rerunCollect
                    ? "When re-collecting is on, this bundle is ignored and fresh evidence is gathered."
                    : "Select which evidence bundle to send for re-reasoning. Each bundle comes from a different collector."}
                </p>
              </div>
            )}

            {/* Mode summary */}
            <div className="flex items-center gap-2 rounded-md bg-muted/20 px-3 py-2">
              <Badge variant="outline" className="text-[10px] shrink-0">
                Mode
              </Badge>
              <span className="text-xs text-muted-foreground">
                {modeLabel}
              </span>
            </div>
          </div>

          {/* ── Section 3: Step-specific patches ───────────────── */}
          {config.id === "prompt_spec" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Modify the specification
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  Prompt spec override (JSON)
                </label>
                <Textarea
                  value={promptSpecOverrideJson}
                  onChange={(e) =>
                    setPromptSpecOverrideJson(e.target.value)
                  }
                  rows={8}
                  className="font-mono text-xs"
                  placeholder='{"market": {"question": "..."}, "extra": {"assumptions": [...]}}'
                />
                <p className="text-[11px] text-muted-foreground">
                  Edit the JSON above to change the market specification. This
                  is pre-filled with the current spec. Your changes are
                  deep-merged: you only need to include the fields you want to
                  change. Lists (like assumptions) are replaced entirely.
                </p>
              </div>
            </div>
          )}

          {config.id === "evidence" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Add extra evidence
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  Append evidence items (JSON array)
                </label>
                <Textarea
                  value={appendItemsJson}
                  onChange={(e) => setAppendItemsJson(e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                  placeholder={`[\n  {\n    "evidence_id": "ev_manual_1",\n    "source_uri": "https://example.com/article",\n    "source_name": "Example Source",\n    "tier": 2,\n    "fetched_at": "${new Date().toISOString()}",\n    "content_hash": "",\n    "parsed_excerpt": "The relevant finding...",\n    "status_code": 200\n  }\n]`}
                />
                <p className="text-[11px] text-muted-foreground">
                  Optional. Add evidence items the collectors missed. Each
                  item needs at minimum: evidence_id, source_uri,
                  source_name, parsed_excerpt. These items are appended to the
                  evidence bundle before re-reasoning.
                </p>
              </div>
            </div>
          )}

          {/* ── Section 4: Advanced (collapsed) ────────────────── */}
          <div className="border-t border-border/30 pt-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight
                className={cn(
                  "w-3 h-3 transition-transform",
                  showAdvanced && "rotate-90"
                )}
              />
              Advanced options
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    Target artifact
                  </label>
                  <Select
                    value={targetArtifact}
                    onValueChange={(v) =>
                      setTargetArtifact(v as DisputeTargetArtifact)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_ARTIFACT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <span>{opt.label}</span>
                            <span className="text-muted-foreground">
                              - {opt.description}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Pre-filled based on the step you are disputing. Change
                    this only if you want to target a different part of the
                    pipeline.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    Leaf path
                  </label>
                  <Textarea
                    value={leafPath}
                    onChange={(e) => setLeafPath(e.target.value)}
                    rows={1}
                    placeholder="e.g. items[3].extracted_fields.confidence_score"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Optional. Point to a specific field within the target
                    artifact using dot/bracket notation. Use this to narrow
                    the dispute to a single value instead of the whole
                    artifact.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <p className="text-[11px] text-muted-foreground mr-auto">
            The system will produce a new verdict and show a before/after
            comparison.
          </p>
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !message.trim() ||
              (rerunCollect &&
                config.id !== "prompt_spec" &&
                !canFullRerun)
            }
            className={cn(
              "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
              "bg-violet-500/20 text-violet-200 border border-violet-500/40 hover:bg-violet-500/25",
              (submitting || !message.trim()) &&
                "opacity-50 cursor-not-allowed"
            )}
          >
            {submitting ? "Submitting..." : "Submit dispute"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
