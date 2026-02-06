// ─── Source / Official Market ────────────────────────────────────────────────

export type SourceStatus =
  | "OPEN"
  | "CLOSED"
  | "RESOLVED"
  | "CANCELLED"
  | "DISPUTED";

export type Outcome = "YES" | "NO" | "INVALID" | "UNKNOWN";

export interface SourceInfo {
  platform: string;
  event_url: string;
  title: string;
  question: string;
  resolution_deadline: string;
  resolution_window: { start: string; end: string };
  status: SourceStatus;
  official_outcome: Outcome;
  official_resolved_at: string | null;
  last_updated_at: string;
}

// ─── Parse Result / PromptSpec / ToolPlan ────────────────────────────────────

export interface ParseMetadata {
  compiler: string;
  strict_mode: boolean;
  question_type: string;
}

export interface ResolutionRule {
  rule_id: string;
  description: string;
  priority: number;
}

export interface DisputePolicy {
  dispute_window_seconds: number;
  allow_challenges: boolean;
}

export interface SourceTarget {
  uri: string;
  provider: string;
}

export interface DataRequirement {
  requirement_id: string;
  description: string;
  source_targets: SourceTarget[];
  expected_fields: string[];
  selection_policy: {
    strategy: string;
    quorum: number;
  };
  deferred_source_discovery?: boolean;
}

export interface MarketSpec {
  question: string;
  event_definition: string;
  timezone: string;
  resolution_deadline: string;
  resolution_window: { start: string; end: string };
  resolution_rules: ResolutionRule[];
  allowed_sources: string[];
  min_provenance_tier: number;
  dispute_policy: DisputePolicy;
  metadata: Record<string, unknown>;
}

export interface PromptSpec {
  schema_version: string;
  task_type: string;
  market: MarketSpec;
  prediction_semantics: string;
  data_requirements: DataRequirement[];
  output_schema_ref: string;
  forbidden_behaviors: string[];
  created_at: string | null;
  tool_plan: string | null; // reference id
  extra: Record<string, unknown>;
}

export interface ToolPlanSource {
  source_id: string;
  provider: string;
  endpoint: string;
  tier: number;
}

export interface ToolPlan {
  plan_id: string;
  requirements: string[];
  sources: ToolPlanSource[];
  min_provenance_tier: number;
  allow_fallbacks: boolean;
  extra: Record<string, unknown>;
}

export interface ParseResult {
  ok: boolean;
  prompt_spec: PromptSpec | null;
  tool_plan: ToolPlan | null;
  error: string | null;
  metadata: ParseMetadata;
}

// ─── Oracle Run Summary ─────────────────────────────────────────────────────

export type ExecutionMode = "live" | "replay" | "dry_run";

export interface Check {
  check_id: string;
  name: string;
  status: "pass" | "fail" | "warn" | "skip";
  message: string;
  requirement_id?: string;
}

export interface EvidenceSource {
  source_id: string;
  url: string;
  credibility_tier: string;
  relevance_reason: string;
}

export interface ExtractedFields {
  confidence_score?: number;
  resolution_status?: string;
  evidence_sources?: EvidenceSource[];
}

export interface EvidenceItem {
  evidence_id: string;
  source_uri: string;
  source_name: string;
  tier: number;
  fetched_at: string;
  content_hash: string;
  parsed_excerpt: string;
  status_code: number;
  success?: boolean;
  error?: string | null;
  extracted_fields?: ExtractedFields;
}

export type ReasoningStepType =
  | "validity_check"
  | "evidence_analysis"
  | "rule_application"
  | "confidence_assessment";

export interface ReasoningStep {
  step_id: string;
  step_type: ReasoningStepType;
  description: string;
  conclusion: string;
  confidence_delta: number;
  depends_on: string[];
}

export interface ConfidenceAdjustment {
  reason: string;
  delta: number;
}

export interface ConfidenceBreakdown {
  base: number;
  adjustments: ConfidenceAdjustment[];
  final: number;
}

export interface LLMReview {
  reasoning_valid: boolean;
  issues: string[];
  confidence_adjustments: ConfidenceAdjustment[];
  final_justification: string;
}

export interface ExecutionStep {
  tool: string;
  uri: string;
  started_at: string;
  ended_at: string;
  success: boolean;
  latency_ms: number;
}

export interface DiscoveredSource {
  url: string;
  title: string;
  relevance: "high" | "medium" | "low";
}

export interface RunSummary {
  market_id: string;
  outcome: Outcome;
  confidence: number;
  por_root: string;
  prompt_spec_hash: string;
  evidence_root: string;
  reasoning_root: string;
  ok: boolean;
  verification_ok: boolean;
  execution_mode: ExecutionMode;
  executed_at: string;
  duration_ms: number;
  checks: Check[];
  errors: string[];
  // Extended fields
  evidence_summary?: string;
  reasoning_summary?: string;
  justification?: string;
  evidence_items?: EvidenceItem[];
  reasoning_steps?: ReasoningStep[];
  confidence_breakdown?: ConfidenceBreakdown;
  llm_review?: LLMReview;
  execution_steps?: ExecutionStep[];
  discovered_sources?: DiscoveredSource[];
}

// ─── Market Case (merged view) ──────────────────────────────────────────────

export type MatchStatus =
  | "MATCH"
  | "MISMATCH"
  | "PENDING"
  | "VERIFICATION_FAILED";

export interface MarketCase {
  market_id: string;
  source: SourceInfo;
  parse_result: ParseResult;
  oracle_result: RunSummary | null;
}

// ─── Derived helpers ────────────────────────────────────────────────────────

export function getMatchStatus(c: MarketCase): MatchStatus {
  if (c.oracle_result && !c.oracle_result.verification_ok) {
    return "VERIFICATION_FAILED";
  }
  if (
    !c.oracle_result ||
    c.source.official_outcome === "UNKNOWN" ||
    c.oracle_result.outcome === "UNKNOWN"
  ) {
    return "PENDING";
  }
  return c.source.official_outcome === c.oracle_result.outcome
    ? "MATCH"
    : "MISMATCH";
}
