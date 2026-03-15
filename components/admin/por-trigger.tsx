"use client";

import { useState } from "react";
import { useRole } from "@/lib/role";
import { callApi, toRunSummary } from "@/lib/oracle-api";
import type { RunSummary } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface PorTriggerProps {
  question: string;
  onResult: (result: RunSummary) => void;
}

export function PorTrigger({ question, onResult }: PorTriggerProps) {
  const { accessCode } = useRole();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunSummary | null>(null);

  async function handleRun() {
    if (!accessCode) return;
    setLoading(true);
    try {
      const raw = await callApi(accessCode, "/step/resolve", { question });
      const summary = toRunSummary(raw);
      setResult(summary);
      onResult(summary);
      toast.success("PoR complete");
    } catch (err) {
      toast.error("PoR failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          onClick={handleRun}
          disabled={loading}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {loading ? "Running PoR…" : "Run Proof of Reasoning"}
        </button>
      </div>

      {result && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-primary mb-3">Proof of Reasoning Result</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Outcome</span>
                <p className="text-lg font-bold">{result.outcome}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Confidence</span>
                <p className="text-lg font-bold">{(result.confidence * 100).toFixed(0)}%</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">PoR Root</span>
                <p className="font-mono text-xs truncate">{result.por_root}</p>
              </div>
            </div>
            {result.evidence_bundles && result.evidence_bundles.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-primary cursor-pointer">
                  View evidence ({result.evidence_bundles.reduce((n, b) => n + b.items.length, 0)} items)
                </summary>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {result.evidence_bundles.map((b) => (
                    <p key={b.bundle_id}>
                      <Badge variant="outline" className="text-[10px] mr-1">{b.collector_name}</Badge>
                      {b.items.length} items
                    </p>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
