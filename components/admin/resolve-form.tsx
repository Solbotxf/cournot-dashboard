"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { useRole } from "@/lib/role";
import { updateMarket } from "@/lib/admin-api";
import type { RunSummary } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, CheckCircle, ArrowLeft, Pencil } from "lucide-react";

interface ResolveFormProps {
  marketId: number;
  porResult: RunSummary | null;
  rawAiResult?: string;
  onResolved?: () => void;
  onRevertToMonitoring?: () => void;
}

export function ResolveForm({ marketId, porResult, rawAiResult, onResolved, onRevertToMonitoring }: ResolveFormProps) {
  const { accessCode } = useRole();
  const [loading, setLoading] = useState(false);

  // Extract initial values from existing rawAiResult if available
  function parseRawAiResult(): { outcome: string; confidence: string; reasoning: string } {
    if (!rawAiResult) return { outcome: "", confidence: "", reasoning: "" };
    try {
      const parsed = JSON.parse(rawAiResult);
      return {
        outcome: parsed.outcome ?? "",
        confidence: parsed.confidence != null ? String(parsed.confidence) : "",
        reasoning:
          parsed.artifacts?.reasoning_trace?.reasoning_summary ??
          parsed.artifacts?.verdict?.metadata?.justification ??
          "",
      };
    } catch {
      return { outcome: "", confidence: "", reasoning: "" };
    }
  }

  const initial = parseRawAiResult();
  const [outcome, setOutcome] = useState(porResult?.outcome ?? initial.outcome);
  const [confidence, setConfidence] = useState(
    porResult?.confidence != null ? String(porResult.confidence) : initial.confidence
  );
  const [reasoning, setReasoning] = useState(
    porResult?.reasoning_summary ?? initial.reasoning
  );

  // Update when PoR result arrives (re-run or dispute)
  useEffect(() => {
    if (porResult) {
      setOutcome(porResult.outcome);
      setConfidence(String(porResult.confidence));
      if (porResult.reasoning_summary) {
        setReasoning(porResult.reasoning_summary);
      }
    }
  }, [porResult]);

  // Update from rawAiResult when it changes (dispute updates, etc.)
  // but only if porResult hasn't been set (porResult takes priority via its own effect)
  useEffect(() => {
    if (!porResult && rawAiResult) {
      const vals = parseRawAiResult();
      if (vals.outcome) setOutcome(vals.outcome);
      if (vals.confidence) setConfidence(vals.confidence);
      if (vals.reasoning) setReasoning(vals.reasoning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawAiResult]);

  /** Build the ai_result string to send to backend.
   *  If rawAiResult is available (from PoR run or dispute), use it as the
   *  base and apply admin's outcome/confidence/reasoning overrides so the
   *  full artifacts format is preserved. Otherwise fall back to a minimal
   *  object. */
  function buildAiResult(): string {
    const adminOutcome = outcome.trim();
    const adminConfidence = parseFloat(confidence) || 0;
    const adminReasoning = reasoning.trim() || undefined;

    if (rawAiResult) {
      try {
        const parsed = JSON.parse(rawAiResult);
        // Top-level overrides
        parsed.outcome = adminOutcome;
        parsed.confidence = adminConfidence;

        // Sync verdict inside artifacts
        if (parsed.artifacts?.verdict) {
          parsed.artifacts.verdict.outcome = adminOutcome;
          parsed.artifacts.verdict.confidence = adminConfidence;
          if (parsed.artifacts.verdict.metadata) {
            parsed.artifacts.verdict.metadata.justification =
              adminReasoning ?? parsed.artifacts.verdict.metadata.justification;
          }
        }
        // Sync verdict inside por_bundle if present
        if (parsed.artifacts?.por_bundle?.verdict) {
          parsed.artifacts.por_bundle.verdict.outcome = adminOutcome;
          parsed.artifacts.por_bundle.verdict.confidence = adminConfidence;
          if (parsed.artifacts.por_bundle.verdict.metadata) {
            parsed.artifacts.por_bundle.verdict.metadata.justification =
              adminReasoning ?? parsed.artifacts.por_bundle.verdict.metadata.justification;
          }
        }
        return JSON.stringify(parsed);
      } catch {
        // If parse fails, fall through to minimal object
      }
    }

    // Minimal fallback
    return JSON.stringify({
      ok: true,
      errors: [],
      outcome: adminOutcome,
      confidence: adminConfidence,
      reasoning: adminReasoning,
      por_root: porResult?.por_root || undefined,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessCode || !outcome.trim()) return;
    setLoading(true);
    try {
      await updateMarket(accessCode, marketId, {
        status: "resolved",
        ai_result: buildAiResult(),
      });
      toast.success("Market resolved");
      onResolved?.();
    } catch {
      // Error handled by admin-api
    } finally {
      setLoading(false);
    }
  }

  // ── Advanced Edit dialog state ──
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedJson, setAdvancedJson] = useState("");
  const [advancedJsonError, setAdvancedJsonError] = useState<string | null>(null);
  const [advancedLoading, setAdvancedLoading] = useState(false);

  function handleOpenAdvanced() {
    // Seed the editor with the current full ai_result, pretty-printed
    const base = buildAiResult();
    try {
      setAdvancedJson(JSON.stringify(JSON.parse(base), null, 2));
      setAdvancedJsonError(null);
    } catch {
      setAdvancedJson(base);
      setAdvancedJsonError(null);
    }
    setAdvancedOpen(true);
  }

  function handleAdvancedJsonChange(value: string) {
    setAdvancedJson(value);
    try {
      JSON.parse(value);
      setAdvancedJsonError(null);
    } catch (e) {
      setAdvancedJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  async function handleAdvancedSubmit() {
    if (!accessCode) return;
    // Validate JSON one more time
    try {
      JSON.parse(advancedJson);
    } catch (e) {
      toast.error("Invalid JSON", {
        description: e instanceof Error ? e.message : "Cannot parse JSON",
      });
      return;
    }

    setAdvancedLoading(true);
    try {
      await updateMarket(accessCode, marketId, {
        status: "resolved",
        ai_result: advancedJson,
      });
      toast.success("Market resolved with manual edits");
      setAdvancedOpen(false);
      onResolved?.();
    } catch {
      // Error handled by admin-api
    } finally {
      setAdvancedLoading(false);
    }
  }

  return (
    <>
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-green-400 mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Final Resolve
          </p>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Outcome *</label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select...</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                  <option value="INVALID">INVALID</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Confidence (0-1)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reasoning</label>
              <Textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Reasoning for this outcome..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || !outcome.trim()}
                className="h-9 rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition-colors hover:bg-green-600/90 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Final Resolve
              </button>
              <button
                type="button"
                onClick={handleOpenAdvanced}
                disabled={loading}
                className="h-9 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Advanced Edit
              </button>
              {onRevertToMonitoring && (
                <button
                  type="button"
                  onClick={onRevertToMonitoring}
                  disabled={loading}
                  className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Revert to Monitoring
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Advanced Edit Dialog */}
      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">Advanced Edit &mdash; ai_result JSON</DialogTitle>
            <DialogDescription className="text-xs">
              Manually edit the full ai_result JSON. Changes will be sent directly to the backend on submit.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 space-y-2">
            <textarea
              value={advancedJson}
              onChange={(e) => handleAdvancedJsonChange(e.target.value)}
              spellCheck={false}
              className="w-full h-[60vh] rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono text-foreground resize-none focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {advancedJsonError && (
              <p className="text-xs text-red-400">
                JSON error: {advancedJsonError}
              </p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setAdvancedOpen(false)}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  setAdvancedJson(JSON.stringify(JSON.parse(advancedJson), null, 2));
                  setAdvancedJsonError(null);
                  toast.success("JSON formatted");
                } catch (e) {
                  toast.error("Cannot format", {
                    description: e instanceof Error ? e.message : "Invalid JSON",
                  });
                }
              }}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"
            >
              Format JSON
            </button>
            <button
              type="button"
              onClick={handleAdvancedSubmit}
              disabled={advancedLoading || !!advancedJsonError}
              className="h-9 rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition-colors hover:bg-green-600/90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {advancedLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Resolve with Manual Edits
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
