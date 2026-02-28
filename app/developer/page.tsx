"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Copy,
  Check,
  Terminal,
  Braces,
  GitBranch,
  Server,
  Search,
  Scale,
  Gavel,
  PackageCheck,
  BookOpen,
  AlertTriangle,
  Hash,
  ChevronRight,

} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  function copy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }
  return { copiedId, copy };
}

function CodeBlock({ id, code, language }: { id: string; code: string; language?: string }) {
  const { copiedId, copy } = useCopyToClipboard();
  return (
    <div className="group relative">
      {language && (
        <div className="absolute left-3 top-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 select-none">
          {language}
        </div>
      )}
      <pre
        className={cn(
          "rounded-lg border border-border/60 bg-background p-4 text-[13px] leading-relaxed overflow-x-auto font-[family-name:var(--font-geist-mono)]",
          language && "pt-8"
        )}
      >
        <code className="text-muted-foreground">{code}</code>
      </pre>
      <button
        onClick={() => copy(id, code)}
        className="absolute right-2 top-2 rounded-md border border-border bg-card p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
        title="Copy to clipboard"
      >
        {copiedId === id ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colorMap: Record<string, string> = {
    POST: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    GET: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
  };
  return (
    <Badge className={cn("text-[10px] font-bold uppercase tracking-wider", colorMap[method] ?? "")}>
      {method}
    </Badge>
  );
}

function SectionAnchor({ id }: { id: string }) {
  return <div id={id} className="scroll-mt-20" />;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground font-[family-name:var(--font-geist-mono)]">
      {children}
    </code>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
      {children}
    </p>
  );
}

function ParamBadge({ required }: { required?: boolean }) {
  return required ? (
    <Badge className="text-[9px] font-medium uppercase tracking-wider text-rose-400 border-rose-500/20 bg-rose-500/10 ml-1.5">
      required
    </Badge>
  ) : (
    <Badge className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground border-border bg-transparent ml-1.5">
      optional
    </Badge>
  );
}

// ─── Field table component ──────────────────────────────────────────────────

interface FieldRow {
  key: string;
  type: string;
  description: string;
  required?: boolean;
}

function FieldTable({ fields, label }: { fields: FieldRow[]; label?: string }) {
  return (
    <div>
      {label && <SectionLabel>{label}</SectionLabel>}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Field
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Type
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {fields.map((field) => (
              <tr key={field.key} className="hover:bg-accent/20">
                <td className="px-3 py-2 whitespace-nowrap">
                  <code className="text-[12px] font-[family-name:var(--font-geist-mono)] text-violet-400">
                    {field.key}
                  </code>
                  {field.required !== undefined && <ParamBadge required={field.required} />}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <code className="text-[12px] font-[family-name:var(--font-geist-mono)] text-muted-foreground">
                    {field.type}
                  </code>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{field.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Endpoint section component ─────────────────────────────────────────────

interface EndpointProps {
  id: string;
  method: string;
  path: string;
  title: string;
  description: string;
  icon: typeof Terminal;
  stepNumber?: number;
  requestFields?: FieldRow[];
  requestExample: string;
  responseFields: FieldRow[];
  responseExample: string;
  schemaDetail?: string;
  curlExample?: string;
  notes?: string[];
}

function EndpointSection({
  id,
  method,
  path,
  title,
  description,
  icon: Icon,
  stepNumber,
  requestFields,
  requestExample,
  responseFields,
  responseExample,
  schemaDetail,
  curlExample,
  notes,
}: EndpointProps) {
  const borderColor = method === "GET" ? "from-emerald-500" : "from-amber-500";
  const iconBg = method === "GET" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-violet-500/10 border-violet-500/20";
  const iconColor = method === "GET" ? "text-emerald-400" : "text-violet-400";

  return (
    <>
      <SectionAnchor id={id} />
      <Card className="border-border/50 overflow-hidden">
        <div className={cn("h-1 bg-gradient-to-r to-transparent", borderColor)} />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {stepNumber !== undefined && (
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10 text-[12px] font-bold text-violet-400 border border-violet-500/20 shrink-0">
                {stepNumber}
              </div>
            )}
            <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg border shrink-0", iconBg)}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 ml-0">
            <MethodBadge method={method} />
            <code className="text-sm font-[family-name:var(--font-geist-mono)] text-foreground">
              {path}
            </code>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

          {/* Request Parameters */}
          {requestFields && requestFields.length > 0 && (
            <FieldTable fields={requestFields} label="Request Parameters" />
          )}

          {/* Request Body */}
          <div>
            <SectionLabel>Request Body</SectionLabel>
            <CodeBlock id={`${id}-req`} code={requestExample} language="json" />
          </div>

          {/* cURL Example */}
          {curlExample && (
            <div>
              <SectionLabel>cURL Example</SectionLabel>
              <CodeBlock id={`${id}-curl`} code={curlExample} language="bash" />
            </div>
          )}

          {/* Response Fields */}
          <FieldTable fields={responseFields} label="Response Fields" />

          {/* Response Example */}
          <div>
            <SectionLabel>Response Example</SectionLabel>
            <CodeBlock id={`${id}-res`} code={responseExample} language="json" />
          </div>

          {/* Schema Detail */}
          {schemaDetail && (
            <div>
              <SectionLabel>Schema Detail</SectionLabel>
              <CodeBlock id={`${id}-schema`} code={schemaDetail} />
            </div>
          )}

          {/* Notes */}
          {notes && notes.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  Notes
                </span>
              </div>
              <ul className="space-y-1">
                {notes.map((note, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-amber-400/60 shrink-0">&bull;</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ─── Data ───────────────────────────────────────────────────────────────────

const COLLECTORS = [
  { name: "CollectorOpenSearch", priority: 200, description: "Open web search collector" },
  { name: "CollectorCRP", priority: 195, description: "CRP (Contextual Retrieval Pipeline) collector" },
  { name: "CollectorHyDE", priority: 190, description: "HyDE (Hypothetical Document Embeddings) collector" },
  { name: "CollectorWebPageReader", priority: 180, description: "Fetches and reads specific web pages for evidence" },
  { name: "CollectorSitePinned", priority: 175, description: "Targets pinned/known source URLs from the prompt spec" },
  { name: "CollectorPAN", priority: 170, description: "PAN (Parallel Augmented Navigation) collector" },
  { name: "CollectorAgenticRAG", priority: 160, description: "Agentic RAG collector with autonomous retrieval" },
  { name: "CollectorGraphRAG", priority: 150, description: "Graph-based RAG collector" },
  { name: "CollectorHTTP", priority: 100, description: "Direct HTTP fetch collector" },
];

const PROVIDERS = [
  { provider: "openai", model: "gpt-4o" },
  { provider: "google", model: "gemini-2.5-flash" },
  { provider: "grok", model: "grok-4-fast" },
];

const TOC_ITEMS = [
  { id: "gateway", label: "Backend Gateway" },
  { id: "authentication", label: "Authentication" },
  { id: "step-prompt", label: "Step 1 - Prompt", indent: true },
  { id: "step-collect", label: "Step 2 - Collect", indent: true },
  { id: "step-audit", label: "Step 3 - Audit", indent: true },
  { id: "step-judge", label: "Step 4 - Judge", indent: true },
  { id: "step-bundle", label: "Step 5 - Bundle", indent: true },
  { id: "capabilities", label: "Capabilities" },
  { id: "collectors", label: "Collectors & Providers" },
  { id: "errors", label: "Error Handling" },
  { id: "quickstart", label: "Quick Start" },
];

// ─── Page Component ─────────────────────────────────────────────────────────

export default function DeveloperPage() {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    const ids = TOC_ITEMS.map((item) => item.id);
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex gap-8">
      {/* Sticky sidebar TOC */}
      <nav className="hidden xl:block w-52 shrink-0">
        <div className="sticky top-20 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3 px-2">
            On this page
          </p>
          {TOC_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "block text-xs py-1 px-2 rounded-md transition-colors",
                item.indent && "ml-3",
                activeSection === item.id
                  ? "text-foreground bg-accent/50 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-8 pb-20">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Reference</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-2xl">
            Complete reference for the Cournot Proof-of-Reasoning pipeline API. The pipeline
            resolves prediction market questions in five sequential steps, producing a cryptographically
            verifiable Proof-of-Reasoning bundle.
          </p>
        </div>

        {/* Base URL & Gateway */}
        <SectionAnchor id="gateway" />
        <Card className="border-border/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Server className="h-4 w-4 text-violet-400" />
              </div>
              <CardTitle className="text-base">Backend Gateway</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              All API requests are made to a single gateway endpoint. The gateway accepts a
              standardized envelope and routes to internal pipeline paths. Responses are also wrapped
              in a gateway envelope.
            </p>

            <div>
              <SectionLabel>Base Endpoint</SectionLabel>
              <div className="flex items-center gap-2">
                <MethodBadge method="POST" />
                <code className="text-sm font-[family-name:var(--font-geist-mono)] text-foreground">
                  https://interface.cournot.ai/play/polymarket/ai_data
                </code>
              </div>
            </div>

            <div>
              <SectionLabel>Request Envelope</SectionLabel>
              <p className="text-xs text-muted-foreground mb-3">
                Every request must be wrapped in this envelope. The actual payload goes inside{" "}
                <InlineCode>post_data</InlineCode> as a JSON-stringified string.
              </p>
              <CodeBlock
                id="envelope"
                code={`{
  "code":      "<YOUR_ACCESS_CODE>",
  "post_data": "<STRINGIFIED_JSON_PAYLOAD>",
  "path":      "<INTERNAL_PATH>",
  "method":    "<HTTP_METHOD>"
}`}
                language="json"
              />
            </div>

            <FieldTable
              label="Envelope Fields"
              fields={[
                { key: "code", type: "string", description: "Your API access code for authentication", required: true },
                { key: "post_data", type: "string", description: "JSON-stringified request payload. Use \"{}\" for GET requests with no body.", required: true },
                { key: "path", type: "string", description: "Internal pipeline path, e.g. \"/step/prompt\" or \"/capabilities\"", required: true },
                { key: "method", type: "string", description: "HTTP method for the internal route: \"POST\" or \"GET\"", required: true },
              ]}
            />

            <div>
              <SectionLabel>Gateway Response Envelope</SectionLabel>
              <p className="text-xs text-muted-foreground mb-3">
                All responses are wrapped in this envelope. A successful call returns{" "}
                <InlineCode>code: 0</InlineCode>. The step-level response is JSON-stringified
                inside <InlineCode>data.result</InlineCode> and must be parsed separately.
              </p>
              <CodeBlock
                id="response-envelope"
                code={`{
  "code": 0,
  "msg":  "Success",
  "data": {
    "result": "<STRINGIFIED_STEP_RESPONSE>"
  }
}`}
                language="json"
              />
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <SectionAnchor id="authentication" />
        <Card className="border-border/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-transparent" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Hash className="h-4 w-4 text-blue-400" />
              </div>
              <CardTitle className="text-base">Authentication</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              All requests require a valid access code passed in the <InlineCode>code</InlineCode> field
              of the gateway envelope. If the code is invalid or missing, the gateway returns error
              code <InlineCode>4100</InlineCode>.
            </p>
            <CodeBlock
              id="auth-example"
              code={`// Valid request
{
  "code": "YOUR_ACCESS_CODE",  // Required in every request
  "post_data": "{}",
  "path": "/capabilities",
  "method": "GET"
}

// Error response for invalid code
{
  "code": 4100,
  "msg": "Invalid access code",
  "data": null
}`}
              language="json"
            />
          </CardContent>
        </Card>

        {/* Pipeline overview */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20">
                <GitBranch className="h-4 w-4 text-violet-400" />
              </div>
              <CardTitle className="text-base">Pipeline Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The PoR pipeline consists of five sequential steps. Each step produces artifacts consumed
              by subsequent steps. Steps must be called in order.
            </p>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {[
                { num: 1, name: "Prompt", icon: Terminal, id: "step-prompt" },
                { num: 2, name: "Collect", icon: Search, id: "step-collect" },
                { num: 3, name: "Audit", icon: Scale, id: "step-audit" },
                { num: 4, name: "Judge", icon: Gavel, id: "step-judge" },
                { num: 5, name: "Bundle", icon: PackageCheck, id: "step-bundle" },
              ].map((step, i, arr) => (
                <div key={step.num} className="flex items-center gap-1 shrink-0">
                  <a
                    href={`#${step.id}`}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
                  >
                    <step.icon className="h-3.5 w-3.5" />
                    <span>
                      {step.num}. {step.name}
                    </span>
                  </a>
                  {i < arr.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Supported paths summary table */}
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Method
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Path
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Description
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {[
                    { method: "POST", path: "/step/prompt", desc: "Compile question into prompt spec + tool plan", anchor: "step-prompt" },
                    { method: "POST", path: "/step/collect", desc: "Gather evidence from external sources", anchor: "step-collect" },
                    { method: "POST", path: "/step/audit", desc: "Produce reasoning trace from evidence", anchor: "step-audit" },
                    { method: "POST", path: "/step/judge", desc: "Determine outcome and confidence", anchor: "step-judge" },
                    { method: "POST", path: "/step/bundle", desc: "Build cryptographic PoR bundle", anchor: "step-bundle" },
                    { method: "GET", path: "/capabilities", desc: "List available providers, collectors, and steps", anchor: "capabilities" },
                  ].map((row) => (
                    <tr key={row.path} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <MethodBadge method={row.method} />
                      </td>
                      <td className="px-4 py-2.5">
                        <a href={`#${row.anchor}`} className="group/link flex items-center gap-1.5">
                          <code className="text-[13px] font-[family-name:var(--font-geist-mono)] text-foreground group-hover/link:text-violet-400 transition-colors">
                            {row.path}
                          </code>
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.desc}</td>
                      <td className="px-4 py-2.5">
                        <a href={`#${row.anchor}`}>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              For <InlineCode>GET</InlineCode> requests, set <InlineCode>post_data</InlineCode> to{" "}
              <InlineCode>{`"{}"`}</InlineCode> in the envelope.
            </p>
          </CardContent>
        </Card>

        {/* ─── Step 1: Prompt ─────────────────────────────────────────────── */}
        <EndpointSection
          id="step-prompt"
          method="POST"
          path="/step/prompt"
          title="Prompt Compilation"
          stepNumber={1}
          icon={Terminal}
          description="Compiles a natural-language market question into a structured prompt specification and tool plan. This is the entry point of the pipeline. The prompt spec defines the resolution rules, allowed sources, and prediction semantics. The tool plan specifies which data requirements need to be fulfilled and from which sources."
          requestFields={[
            { key: "user_input", type: "string", description: "The natural-language market question to resolve", required: true },
            { key: "strict_mode", type: "boolean", description: "When true, only official sources are allowed. Defaults to false.", required: false },
          ]}
          requestExample={`{
  "user_input": "Will Bitcoin exceed 100k by March 2025?",
  "strict_mode": false
}`}
          curlExample={`curl -X POST 'https://interface.cournot.ai/play/polymarket/ai_data' \\
  -H 'Content-Type: application/json' \\
  --max-time 300 \\
  -d '{
    "code": "YOUR_CODE",
    "post_data": "{\\"user_input\\": \\"Will Bitcoin exceed 100k by March 2025?\\", \\"strict_mode\\": false}",
    "path": "/step/prompt",
    "method": "POST"
  }'`}
          responseFields={[
            { key: "ok", type: "boolean", description: "Whether the step succeeded" },
            { key: "market_id", type: "string", description: "Generated market identifier, e.g. \"mk_3f5b9c7e\"" },
            { key: "prompt_spec", type: "PromptSpec", description: "Structured specification including market definition, resolution rules, and data requirements" },
            { key: "tool_plan", type: "ToolPlan", description: "Execution plan referencing requirements and sources to query" },
            { key: "metadata", type: "object", description: "Compiler info, strict_mode flag, requirement count" },
            { key: "error", type: "string | null", description: "Error message if compilation failed" },
          ]}
          responseExample={`{
  "ok": true,
  "market_id": "mk_3f5b9c7e",
  "prompt_spec": {
    "schema_version": "v1",
    "task_type": "prediction_resolution",
    "market": {
      "market_id": "mk_3f5b9c7e",
      "question": "Will Bitcoin exceed 100k by March 2025?",
      "market_type": "binary",
      "possible_outcomes": ["YES", "NO"],
      "resolution_rules": {
        "rules": [
          { "rule_id": "r1", "description": "...", "priority": 1 }
        ]
      }
    },
    "prediction_semantics": {
      "target_entity": "Bitcoin",
      "predicate": "exceeds",
      "threshold": "100000 USD",
      "timeframe": "by March 2025"
    },
    "data_requirements": [
      {
        "requirement_id": "req_01",
        "description": "Current BTC price data",
        "source_targets": [...]
      }
    ]
  },
  "tool_plan": {
    "plan_id": "plan_abc123",
    "requirements": ["req_01"],
    "sources": ["source_coinmarketcap"],
    "min_provenance_tier": 1,
    "allow_fallbacks": true
  },
  "metadata": {
    "compiler": "prompt-compiler-v2",
    "strict_mode": false,
    "requirement_count": 3
  },
  "error": null
}`}
          schemaDetail={`PromptSpec {
  schema_version      "v1"
  task_type           "prediction_resolution"
  market {
    market_id, question, event_definition, timezone
    resolution_deadline, resolution_window { start, end }
    resolution_rules.rules[] { rule_id, description, priority }
    allowed_sources[]  { source_id, kind, allow, min_provenance_tier }
    market_type        "binary"
    possible_outcomes  ["YES", "NO"]
  }
  prediction_semantics { target_entity, predicate, threshold, timeframe }
  data_requirements[] {
    requirement_id, description
    source_targets[] { source_id, uri, method, expected_content_type }
    selection_policy  { strategy, min_sources, max_sources, quorum }
  }
  extra {
    strict_mode, compiler, assumptions[]
    confidence_policy { min_confidence_for_yesno, default_confidence }
  }
}

ToolPlan {
  plan_id, requirements[], sources[]
  min_provenance_tier, allow_fallbacks
}`}
          notes={[
            "This step has no dependencies and can be called directly with just user_input.",
            "The generated prompt_spec and tool_plan are passed to all subsequent steps.",
            "strict_mode constrains the pipeline to only use official/authoritative sources.",
          ]}
        />

        {/* ─── Step 2: Collect ────────────────────────────────────────────── */}
        <EndpointSection
          id="step-collect"
          method="POST"
          path="/step/collect"
          title="Evidence Collection"
          stepNumber={2}
          icon={Search}
          description="Runs the configured collector agents to gather evidence bundles from external sources. Each collector queries different source types (web search, APIs, databases) and returns structured evidence items with provenance metadata. Multiple collectors can run in parallel."
          requestFields={[
            { key: "prompt_spec", type: "PromptSpec", description: "Structured prompt specification from Step 1", required: true },
            { key: "tool_plan", type: "ToolPlan", description: "Execution plan from Step 1", required: true },
            { key: "collectors", type: "string[]", description: "List of collector names to run. See /capabilities for available collectors.", required: false },
            { key: "include_raw_content", type: "boolean", description: "Whether to include raw fetched content in the response. Defaults to false.", required: false },
          ]}
          requestExample={`{
  "prompt_spec": { ... },
  "tool_plan":   { ... },
  "collectors":  ["CollectorWebPageReader", "CollectorOpenSearch"],
  "include_raw_content": false
}`}
          responseFields={[
            { key: "ok", type: "boolean", description: "Whether collection completed successfully" },
            { key: "collectors_used", type: "string[]", description: "Names of collectors that actually ran" },
            { key: "evidence_bundles", type: "EvidenceBundle[]", description: "Array of evidence bundles, one per collector" },
            { key: "execution_logs", type: "ExecutionLog[]", description: "Per-call timing, tool name, input/output, and errors" },
            { key: "errors", type: "string[]", description: "Non-fatal errors encountered during collection" },
          ]}
          responseExample={`{
  "ok": true,
  "collectors_used": ["CollectorWebPageReader", "CollectorOpenSearch"],
  "evidence_bundles": [
    {
      "bundle_id": "eb_a1b2c3",
      "market_id": "mk_3f5b9c7e",
      "collector_name": "CollectorWebPageReader",
      "weight": 1.0,
      "items": [
        {
          "evidence_id": "ev_abc123",
          "source_uri": "https://...",
          "source_name": "CoinMarketCap",
          "tier": 1,
          "fetched_at": "2025-01-15T10:30:00Z",
          "content_hash": "sha256:a1b2c3...",
          "parsed_excerpt": "Bitcoin is currently trading at ...",
          "success": true,
          "extracted_fields": {
            "confidence": 0.85,
            "resolution_status": "OPEN"
          }
        }
      ],
      "collected_at": "2025-01-15T10:30:05Z",
      "execution_time_ms": 4523
    }
  ],
  "execution_logs": [
    {
      "plan_id": "plan_abc123",
      "calls": [
        {
          "tool": "CollectorWebPageReader",
          "started_at": "...",
          "ended_at": "...",
          "error": null
        }
      ]
    }
  ],
  "errors": []
}`}
          schemaDetail={`EvidenceBundle {
  bundle_id, market_id, plan_id, collector_name
  weight             number (default 1.0)
  items[] {
    evidence_id      hex hash
    requirement_id   links back to data_requirements
    provenance {
      source_id, source_uri, tier, fetched_at
      content_hash   SHA-256 of raw content
      cache_hit      boolean
    }
    content_type, parsed_value, success, error
    extracted_fields { ... }
  }
  collected_at, execution_time_ms
  requirements_fulfilled[], requirements_unfulfilled[]
}

ExecutionLog {
  plan_id
  calls[] { tool, input, output, started_at, ended_at, error }
  started_at, ended_at
}`}
          notes={[
            "If collectors is omitted, the pipeline uses a default set based on the tool plan.",
            "Collectors run in priority order (highest first). Higher priority collectors are considered more reliable.",
            "Evidence items include provenance metadata (source_uri, tier, content_hash) for auditability.",
            "Set include_raw_content: true to receive the full fetched content (increases response size significantly).",
          ]}
        />

        {/* ─── Step 3: Audit ──────────────────────────────────────────────── */}
        <EndpointSection
          id="step-audit"
          method="POST"
          path="/step/audit"
          title="Evidence Audit"
          stepNumber={3}
          icon={Scale}
          description="Analyzes collected evidence against the prompt specification to produce a structured reasoning trace. The audit step evaluates each piece of evidence, identifies conflicts, builds reasoning chains, and produces a preliminary outcome assessment with confidence score."
          requestFields={[
            { key: "prompt_spec", type: "PromptSpec", description: "Structured prompt specification from Step 1", required: true },
            { key: "evidence_bundles", type: "EvidenceBundle[]", description: "Evidence bundles from Step 2", required: true },
          ]}
          requestExample={`{
  "prompt_spec":      { ... },
  "evidence_bundles": [ ... ]
}`}
          responseFields={[
            { key: "ok", type: "boolean", description: "Whether audit succeeded" },
            { key: "reasoning_trace", type: "ReasoningTrace", description: "Structured trace with reasoning steps, conflict detection, and preliminary outcome" },
            { key: "errors", type: "string[]", description: "Errors encountered during reasoning" },
          ]}
          responseExample={`{
  "ok": true,
  "reasoning_trace": {
    "trace_id": "tr_xyz789",
    "market_id": "mk_3f5b9c7e",
    "steps": [
      {
        "step_id": "s1",
        "step_type": "evidence_evaluation",
        "description": "Evaluate BTC price data from CoinMarketCap",
        "evidence_refs": [
          {
            "evidence_id": "ev_abc123",
            "source_id": "source_coinmarketcap",
            "field_used": "current_price",
            "value_at_reference": "97500"
          }
        ],
        "conclusion": "BTC is currently at $97,500, close to but below the $100k threshold",
        "confidence_delta": 0.1
      }
    ],
    "conflicts": [],
    "evidence_summary": "Multiple sources confirm BTC near $97.5k ...",
    "reasoning_summary": "Based on current price trajectory ...",
    "preliminary_outcome": "YES",
    "preliminary_confidence": 0.72,
    "recommended_rule_id": "r1"
  },
  "errors": []
}`}
          schemaDetail={`ReasoningTrace {
  trace_id, market_id, bundle_id
  steps[] {
    step_id, step_type, description
    evidence_refs[] {
      evidence_id, requirement_id, source_id
      field_used, value_at_reference
    }
    rule_id, input_summary, output_summary
    conclusion, confidence_delta
    depends_on[], metadata
  }
  conflicts[]
  evidence_summary       human-readable text
  reasoning_summary      human-readable text
  preliminary_outcome    "YES" | "NO" | "INVALID"
  preliminary_confidence number (0-1)
  recommended_rule_id
}`}
          notes={[
            "The preliminary_outcome here is advisory. The final outcome is determined by the Judge step.",
            "The reasoning trace captures step-by-step logic that can be independently verified.",
            "Conflicts between evidence sources are explicitly identified and recorded.",
          ]}
        />

        {/* ─── Step 4: Judge ──────────────────────────────────────────────── */}
        <EndpointSection
          id="step-judge"
          method="POST"
          path="/step/judge"
          title="Judgment"
          stepNumber={4}
          icon={Gavel}
          description="Applies resolution rules to the evidence and reasoning trace to produce a final verdict. The judge evaluates the reasoning validity, applies confidence adjustments, and determines the definitive outcome. Includes an independent LLM review of the reasoning process."
          requestFields={[
            { key: "prompt_spec", type: "PromptSpec", description: "Structured prompt specification from Step 1", required: true },
            { key: "evidence_bundles", type: "EvidenceBundle[]", description: "Evidence bundles from Step 2", required: true },
            { key: "reasoning_trace", type: "ReasoningTrace", description: "Reasoning trace from Step 3", required: true },
          ]}
          requestExample={`{
  "prompt_spec":      { ... },
  "evidence_bundles": [ ... ],
  "reasoning_trace":  { ... }
}`}
          responseFields={[
            { key: "ok", type: "boolean", description: "Whether judgment succeeded" },
            { key: "verdict", type: "Verdict", description: "Full verdict object with cryptographic hashes and LLM review" },
            { key: "outcome", type: "string", description: "Final outcome: \"YES\", \"NO\", or \"INVALID\"" },
            { key: "confidence", type: "number", description: "Final confidence score between 0 and 1" },
            { key: "errors", type: "string[]", description: "Errors encountered during judgment" },
          ]}
          responseExample={`{
  "ok": true,
  "outcome": "YES",
  "confidence": 0.78,
  "verdict": {
    "market_id": "mk_3f5b9c7e",
    "outcome": "YES",
    "confidence": 0.78,
    "resolution_time": "2025-01-15T10:31:00Z",
    "resolution_rule_id": "r1",
    "prompt_spec_hash": "0xabc123...",
    "evidence_root": "0xdef456...",
    "reasoning_root": "0x789ghi...",
    "justification_hash": "0xjkl012...",
    "selected_leaf_refs": ["ev_abc123", "ev_def456"],
    "metadata": {
      "strict_mode": false,
      "trace_id": "tr_xyz789",
      "justification": "Evidence strongly suggests BTC will exceed $100k ...",
      "llm_review": {
        "outcome": "YES",
        "confidence": 0.78,
        "reasoning_valid": true,
        "reasoning_issues": [],
        "confidence_adjustments": [],
        "final_justification": "The reasoning chain is sound ..."
      }
    }
  },
  "errors": []
}`}
          schemaDetail={`Verdict {
  market_id, outcome, confidence
  resolution_time, resolution_rule_id
  prompt_spec_hash     hex hash
  evidence_root        hex Merkle root
  reasoning_root       hex Merkle root
  justification_hash   hex hash
  selected_leaf_refs[] evidence_id references
  metadata {
    strict_mode, trace_id, bundle_id
    bundle_count, step_count, conflict_count
    justification        human-readable string
    llm_review {
      outcome, confidence, resolution_rule_id
      reasoning_valid    boolean
      reasoning_issues[], confidence_adjustments[]
      final_justification
    }
  }
}`}
          notes={[
            "The outcome is one of: \"YES\", \"NO\", or \"INVALID\" (when evidence is insufficient).",
            "Confidence ranges from 0 to 1. Values below the configured min_confidence_for_yesno threshold result in \"INVALID\".",
            "The verdict includes Merkle root hashes for cryptographic verification of the full reasoning chain.",
            "The llm_review provides an independent assessment of whether the reasoning is sound.",
          ]}
        />

        {/* ─── Step 5: Bundle ─────────────────────────────────────────────── */}
        <EndpointSection
          id="step-bundle"
          method="POST"
          path="/step/bundle"
          title="Proof-of-Reasoning Bundle"
          stepNumber={5}
          icon={PackageCheck}
          description="Hashes all pipeline artifacts into a cryptographic Proof-of-Reasoning (PoR) bundle with Merkle roots. This is the final step that produces a tamper-evident, verifiable record of the entire resolution process. The PoR root hash can be used to independently verify that no artifacts were modified after resolution."
          requestFields={[
            { key: "prompt_spec", type: "PromptSpec", description: "Structured prompt specification from Step 1", required: true },
            { key: "evidence_bundles", type: "EvidenceBundle[]", description: "Evidence bundles from Step 2", required: true },
            { key: "reasoning_trace", type: "ReasoningTrace", description: "Reasoning trace from Step 3", required: true },
            { key: "verdict", type: "Verdict", description: "Verdict object from Step 4", required: true },
          ]}
          requestExample={`{
  "prompt_spec":      { ... },
  "evidence_bundles": [ ... ],
  "reasoning_trace":  { ... },
  "verdict":          { ... }
}`}
          responseFields={[
            { key: "ok", type: "boolean", description: "Whether bundling succeeded" },
            { key: "por_bundle", type: "PoRBundle", description: "Complete Proof-of-Reasoning bundle with all hashes and the full verdict" },
            { key: "por_root", type: "string", description: "Top-level Merkle root hash, e.g. \"0xba9ec9c2...\"" },
            { key: "roots", type: "object", description: "Individual root hashes for each pipeline artifact" },
            { key: "errors", type: "string[]", description: "Errors encountered during bundling" },
          ]}
          responseExample={`{
  "ok": true,
  "por_root": "0xba9ec9c2d4e6f8a0b1c3d5e7f9a2b4c6d8e0f1a3",
  "roots": {
    "prompt_spec_hash": "0xabc123...",
    "evidence_root":    "0xdef456...",
    "reasoning_root":   "0x789ghi...",
    "por_root":         "0xba9ec9c2..."
  },
  "por_bundle": {
    "schema_version": "1.0",
    "protocol_version": "1.0",
    "market_id": "mk_3f5b9c7e",
    "prompt_spec_hash": "0xabc123...",
    "evidence_root": "0xdef456...",
    "reasoning_root": "0x789ghi...",
    "verdict_hash": "0xjkl012...",
    "por_root": "0xba9ec9c2...",
    "verdict": { ... },
    "tee_attestation": null,
    "signatures": {},
    "created_at": "2025-01-15T10:31:05Z",
    "metadata": {
      "pipeline_version": "2.1.0",
      "mode": "live"
    }
  },
  "errors": []
}`}
          schemaDetail={`PoRBundle {
  schema_version, protocol_version, market_id
  prompt_spec_hash   hex
  evidence_root      hex
  reasoning_root     hex
  verdict_hash       hex
  por_root           hex (master Merkle root)
  verdict            full Verdict object
  tee_attestation    null | object
  signatures         {}
  created_at, metadata { pipeline_version, mode }
}

roots {
  prompt_spec_hash   hex
  evidence_root      hex
  reasoning_root     hex
  por_root           hex
}`}
          notes={[
            "The por_root is the master Merkle root that covers all other roots. Use it for single-hash verification.",
            "Individual roots (prompt_spec_hash, evidence_root, reasoning_root) enable partial verification of specific pipeline stages.",
            "tee_attestation and signatures are reserved for future TEE (Trusted Execution Environment) support.",
          ]}
        />

        {/* ─── Capabilities ──────────────────────────────────────────────── */}
        <SectionAnchor id="capabilities" />
        <Card className="border-border/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Search className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Capabilities Discovery</CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <MethodBadge method="GET" />
              <code className="text-sm font-[family-name:var(--font-geist-mono)] text-foreground">
                /capabilities
              </code>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Returns available LLM providers, collector agents, and pipeline step definitions.
              Use this endpoint to discover which collectors and models are available before running
              the pipeline. No request body is required.
            </p>

            <div>
              <SectionLabel>Request</SectionLabel>
              <CodeBlock
                id="capabilities-req"
                code={`curl -X POST 'https://interface.cournot.ai/play/polymarket/ai_data' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "code": "YOUR_CODE",
    "post_data": "{}",
    "path": "/capabilities",
    "method": "GET"
  }'`}
                language="bash"
              />
            </div>

            <FieldTable
              label="Response Fields"
              fields={[
                { key: "providers", type: "Provider[]", description: "Array of available LLM backends with their default models" },
                { key: "steps", type: "StepDef[]", description: "Array of pipeline step definitions with available agents and capabilities" },
              ]}
            />

            <div>
              <SectionLabel>Response Example</SectionLabel>
              <CodeBlock
                id="capabilities-res"
                code={`{
  "providers": [
    { "provider": "openai", "default_model": "gpt-4o" },
    { "provider": "google", "default_model": "gemini-2.5-flash" },
    { "provider": "grok", "default_model": "grok-4-fast" }
  ],
  "steps": [
    {
      "name": "prompt",
      "agents": ["prompt-compiler-v2"],
      "description": "Compile market question into structured specification"
    },
    ...
  ]
}`}
                language="json"
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Collectors & Providers reference ──────────────────────────── */}
        <SectionAnchor id="collectors" />
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Braces className="h-4 w-4 text-violet-400" />
              </div>
              <CardTitle className="text-base">Collectors & Providers</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Collectors are evidence-gathering agents that can be specified in the{" "}
              <InlineCode>collectors</InlineCode> parameter of{" "}
              <a href="#step-collect" className="text-violet-400 hover:underline">/step/collect</a>.
              They run in priority order (highest first).
            </p>

            <div>
              <SectionLabel>Available Collectors</SectionLabel>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Priority
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {COLLECTORS.map((c) => (
                      <tr key={c.name} className="hover:bg-accent/20">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <code className="text-[12px] font-[family-name:var(--font-geist-mono)] text-foreground">
                            {c.name}
                          </code>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-muted-foreground">{c.priority}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {c.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <SectionLabel>Available LLM Providers</SectionLabel>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Provider
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Default Model
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {PROVIDERS.map((p) => (
                      <tr key={p.provider} className="hover:bg-accent/20">
                        <td className="px-3 py-2">
                          <code className="text-[12px] font-[family-name:var(--font-geist-mono)] text-foreground">
                            {p.provider}
                          </code>
                        </td>
                        <td className="px-3 py-2">
                          <code className="text-[12px] font-[family-name:var(--font-geist-mono)] text-muted-foreground">
                            {p.model}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Error Handling ─────────────────────────────────────────────── */}
        <SectionAnchor id="errors" />
        <Card className="border-border/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 to-transparent" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <CardTitle className="text-base">Error Handling</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Errors can occur at two levels: the gateway envelope and the step response. Always check both.
            </p>

            <div>
              <SectionLabel>Gateway Error Codes</SectionLabel>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Code
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Meaning
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    <tr className="hover:bg-accent/20">
                      <td className="px-4 py-2.5">
                        <code className="text-[12px] font-[family-name:var(--font-geist-mono)] text-emerald-400">0</code>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">Success</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        Parse <InlineCode>data.result</InlineCode> as JSON
                      </td>
                    </tr>
                    <tr className="hover:bg-accent/20">
                      <td className="px-4 py-2.5">
                        <code className="text-[12px] font-[family-name:var(--font-geist-mono)] text-red-400">4100</code>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        Invalid access code
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        Verify your access code is correct and active
                      </td>
                    </tr>
                    <tr className="hover:bg-accent/20">
                      <td className="px-4 py-2.5">
                        <code className="text-[12px] font-[family-name:var(--font-geist-mono)] text-amber-400">!= 0</code>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">Other API error</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        Read <InlineCode>msg</InlineCode> for error details
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <SectionLabel>Step-Level Errors</SectionLabel>
              <p className="text-xs text-muted-foreground mb-3">
                Each step response contains an <InlineCode>ok</InlineCode> boolean and an{" "}
                <InlineCode>errors[]</InlineCode> array. Even when the gateway returns{" "}
                <InlineCode>code: 0</InlineCode>, the step itself may have partially failed.
              </p>
              <CodeBlock
                id="error-example"
                code={`// Gateway succeeds but step reports errors
{
  "code": 0,
  "msg": "Success",
  "data": {
    "result": "{
      \\"ok\\": false,
      \\"errors\\": [\\"Timeout fetching source_coinmarketcap\\"],
      \\"evidence_bundles\\": []
    }"
  }
}

// Recommended error handling pattern:
const gateway = await response.json();
if (gateway.code !== 0) {
  throw new Error(\`Gateway error: \${gateway.msg}\`);
}
const step = JSON.parse(gateway.data.result);
if (!step.ok) {
  console.warn("Step errors:", step.errors);
}`}
                language="json"
              />
            </div>

            <div>
              <SectionLabel>HTTP-Level Errors (Proxy)</SectionLabel>
              <p className="text-xs text-muted-foreground mb-3">
                When using the dashboard proxy (<InlineCode>/api/proxy/...</InlineCode>), additional HTTP errors may occur.
              </p>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        HTTP Status
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Meaning
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    <tr className="hover:bg-accent/20">
                      <td className="px-4 py-2.5">
                        <code className="text-[12px] font-[family-name:var(--font-geist-mono)] text-amber-400">502</code>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        Upstream request failed (connection error)
                      </td>
                    </tr>
                    <tr className="hover:bg-accent/20">
                      <td className="px-4 py-2.5">
                        <code className="text-[12px] font-[family-name:var(--font-geist-mono)] text-amber-400">504</code>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        Upstream request timed out (GET: 30s, POST: 300s)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Quick Start ────────────────────────────────────────────────── */}
        <SectionAnchor id="quickstart" />
        <Card className="border-border/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20">
                <BookOpen className="h-4 w-4 text-violet-400" />
              </div>
              <CardTitle className="text-base">Quick Start &mdash; Full Pipeline</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Run all five steps sequentially to produce a complete Proof-of-Reasoning bundle.
              Copy this script and replace <InlineCode>YOUR_CODE</InlineCode> with your access code.
            </p>
          </CardHeader>
          <CardContent>
            <CodeBlock
              id="full-pipeline"
              code={`import json, requests

BASE = "https://interface.cournot.ai/play/polymarket/ai_data"
CODE = "YOUR_CODE"

def call(path: str, payload: dict, method: str = "POST") -> dict:
    """Wrap payload in the gateway envelope and call the API."""
    resp = requests.post(BASE, json={
        "code":      CODE,
        "post_data": json.dumps(payload),
        "path":      path,
        "method":    method,
    }, timeout=300)
    resp.raise_for_status()
    body = resp.json()
    if body["code"] != 0:
        raise RuntimeError(body.get("msg", "API error"))
    return json.loads(body["data"]["result"])

# ── Step 1: Prompt ──────────────────────────────────────────
prompt = call("/step/prompt", {
    "user_input":  "Will Bitcoin exceed 100k by March 2025?",
    "strict_mode": False,
})
spec = prompt["prompt_spec"]
plan = prompt["tool_plan"]
print(f"[1/5] Prompt compiled: {prompt['market_id']}")

# ── Step 2: Collect ─────────────────────────────────────────
collect = call("/step/collect", {
    "prompt_spec": spec,
    "tool_plan":   plan,
    "collectors":  ["CollectorWebPageReader"],
    "include_raw_content": False,
})
bundles = collect["evidence_bundles"]
print(f"[2/5] Collected {len(bundles)} evidence bundle(s)")

# ── Step 3: Audit ───────────────────────────────────────────
audit = call("/step/audit", {
    "prompt_spec":      spec,
    "evidence_bundles": bundles,
})
trace = audit["reasoning_trace"]
print(f"[3/5] Audit: {trace['preliminary_outcome']} "
      f"({trace['preliminary_confidence']:.0%})")

# ── Step 4: Judge ───────────────────────────────────────────
judge = call("/step/judge", {
    "prompt_spec":      spec,
    "evidence_bundles": bundles,
    "reasoning_trace":  trace,
})
verdict = judge["verdict"]
print(f"[4/5] Verdict: {judge['outcome']} ({judge['confidence']:.0%})")

# ── Step 5: Bundle ──────────────────────────────────────────
bundle = call("/step/bundle", {
    "prompt_spec":      spec,
    "evidence_bundles": bundles,
    "reasoning_trace":  trace,
    "verdict":          verdict,
})
print(f"[5/5] PoR Root: {bundle['por_root']}")

# ── Summary ─────────────────────────────────────────────────
print(f"\\nOutcome:    {judge['outcome']}")
print(f"Confidence: {judge['confidence']:.0%}")
print(f"PoR Root:   {bundle['por_root']}")`}
              language="python"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
