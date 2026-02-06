import type { MarketCase, ParseResult, RunSummary, Outcome, SourceStatus } from "./types";

const API_BASE = "https://dev-interface.cournot.ai/play/polymarket";

export interface ApiEvent {
  event_id: number;
  slug: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  result: string;
  result_price: string;
  ai_prompt: string; // JSON string
  ai_result: string; // JSON string or empty
}

export interface ApiEventsData {
  events: ApiEvent[];
  total: number;
}

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

function parseOutcome(result: string): Outcome {
  const upper = result?.toUpperCase?.() ?? "";
  if (upper === "YES" || upper === "TRUE" || upper === "1") return "YES";
  if (upper === "NO" || upper === "FALSE" || upper === "0") return "NO";
  if (upper === "INVALID") return "INVALID";
  return "UNKNOWN";
}

function parseSourceStatus(isClosed: boolean): SourceStatus {
  return isClosed ? "RESOLVED" : "OPEN";
}

/** Transform API event to MarketCase */
export function transformEventToCase(event: ApiEvent): MarketCase {
  const now = new Date().toISOString();

  // Parse ai_prompt JSON
  let parseResult: ParseResult = {
    ok: false,
    prompt_spec: null,
    tool_plan: null,
    error: "No AI prompt data",
    metadata: {
      compiler: "unknown",
      strict_mode: false,
      question_type: "binary",
    },
  };

  if (event.ai_prompt) {
    try {
      const parsed = JSON.parse(event.ai_prompt);
      parseResult = {
        ok: parsed.ok ?? true,
        prompt_spec: parsed.prompt_spec ?? null,
        tool_plan: parsed.tool_plan ?? null,
        error: parsed.error ?? null,
        metadata: parsed.metadata ?? {
          compiler: "cournot-prompt-compiler",
          strict_mode: true,
          question_type: "binary",
        },
      };
    } catch {
      parseResult.error = "Failed to parse ai_prompt JSON";
    }
  }

  // Parse ai_result JSON (only if present and not empty)
  let oracleResult: RunSummary | null = null;

  if (event.ai_result && event.ai_result.trim() !== "") {
    try {
      const parsed = JSON.parse(event.ai_result);
      if (parsed.ok !== undefined) {
        oracleResult = {
          market_id: String(event.event_id),
          outcome: parseOutcome(parsed.outcome),
          confidence: parsed.confidence ?? 0,
          por_root: parsed.por_root ?? "",
          prompt_spec_hash: parsed.prompt_spec_hash ?? "",
          evidence_root: parsed.evidence_root ?? "",
          reasoning_root: parsed.reasoning_root ?? "",
          ok: parsed.ok ?? true,
          verification_ok: parsed.verification_ok ?? true,
          execution_mode: parsed.execution_mode ?? "dry_run",
          executed_at: parsed.executed_at ?? now,
          duration_ms: parsed.duration_ms ?? 0,
          checks: parsed.checks ?? [],
          errors: parsed.errors ?? [],
          evidence_summary: parsed.evidence_summary,
          reasoning_summary: parsed.reasoning_summary,
          justification: parsed.justification,
          evidence_items: parsed.evidence_items,
          reasoning_steps: parsed.reasoning_steps,
          confidence_breakdown: parsed.confidence_breakdown,
          llm_review: parsed.llm_review,
          execution_steps: parsed.execution_steps,
          discovered_sources: parsed.discovered_sources,
        };
      }
    } catch {
      // ai_result couldn't be parsed, leave as null (pending)
    }
  }

  // Determine official outcome
  const isClosed = event.is_closed;
  const officialOutcome: Outcome = isClosed ? parseOutcome(event.result) : "UNKNOWN";
  const officialResolvedAt = isClosed ? event.end_time : null;

  return {
    market_id: String(event.event_id),
    source: {
      platform: "polymarket",
      event_url: `https://polymarket.com/event/${event.slug}`,
      title: event.title,
      question: event.description,
      resolution_deadline: event.end_time,
      resolution_window: {
        start: event.start_time,
        end: event.end_time,
      },
      status: parseSourceStatus(isClosed),
      official_outcome: officialOutcome,
      official_resolved_at: officialResolvedAt,
      last_updated_at: now,
    },
    parse_result: parseResult,
    oracle_result: oracleResult,
  };
}

/** Fetch events from the API */
export async function fetchEvents(
  pageNum: number = 1,
  pageSize: number = 20
): Promise<{ cases: MarketCase[]; total: number; pageNum: number; pageSize: number }> {
  const url = `${API_BASE}/events?page_num=${pageNum}&page_size=${pageSize}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.status} ${res.statusText}`);
  }

  const response: ApiResponse<ApiEventsData> = await res.json();

  if (response.code !== 0) {
    throw new Error(response.msg || "API error");
  }

  const cases = response.data.events.map(transformEventToCase);

  return {
    cases,
    total: response.data.total,
    pageNum,
    pageSize,
  };
}

/** Fetch a single event by ID (searches through paginated results) */
export async function fetchEventById(eventId: string): Promise<MarketCase | null> {
  // The API doesn't have a single-event endpoint, so we search through pages
  // First try to find in recent events (most likely case)
  const pageSize = 100;
  let page = 1;
  const maxPages = 10; // Limit search to avoid too many requests

  while (page <= maxPages) {
    const url = `${API_BASE}/events?page_num=${page}&page_size=${pageSize}`;

    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch events: ${res.status} ${res.statusText}`);
    }

    const response: ApiResponse<ApiEventsData> = await res.json();

    if (response.code !== 0) {
      throw new Error(response.msg || "API error");
    }

    const event = response.data.events.find(
      (e) => String(e.event_id) === eventId || e.slug === eventId
    );

    if (event) {
      return transformEventToCase(event);
    }

    // No more pages to search
    if (response.data.events.length < pageSize) {
      break;
    }

    page++;
  }

  return null;
}
