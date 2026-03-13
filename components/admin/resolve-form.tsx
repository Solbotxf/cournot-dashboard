"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/lib/role";
import { resolveMarket } from "@/lib/admin-api";
import type { RunSummary } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

interface ResolveFormProps {
  marketId: string;
  porResult: RunSummary | null;
}

export function ResolveForm({ marketId, porResult }: ResolveFormProps) {
  const { accessCode } = useRole();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [outcome, setOutcome] = useState(porResult?.outcome ?? "");
  const [confidence, setConfidence] = useState(String(porResult?.confidence ?? ""));
  const [adminNotes, setAdminNotes] = useState("");
  const [evidenceSummary, setEvidenceSummary] = useState("");

  // Update when PoR result arrives
  useEffect(() => {
    if (porResult) {
      setOutcome(porResult.outcome);
      setConfidence(String(porResult.confidence));
    }
  }, [porResult]);

  const isModified = porResult && (
    outcome !== porResult.outcome ||
    parseFloat(confidence) !== porResult.confidence
  );
  const method = !porResult ? "manual" : isModified ? "por_modified" : "por";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessCode || !outcome.trim()) return;
    setLoading(true);
    try {
      const res = await resolveMarket(accessCode, marketId, {
        outcome: outcome.trim(),
        confidence: parseFloat(confidence) || 0,
        method,
        por_root: porResult?.por_root ?? null,
        admin_notes: adminNotes.trim() || null,
        evidence_summary: evidenceSummary.trim() || null,
      });
      const notif = res.notifications;
      toast.success("Market resolved", {
        description: `Lark: ${notif.lark ? "sent" : "failed"}, Telegram: ${notif.telegram ? "sent" : "failed"}`,
      });
      router.push("/admin/markets");
    } catch {
      // Error handled by admin-api
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-green-400 mb-4 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Confirm Resolution
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

          {method !== "por" && (
            <p className="text-xs text-amber-400">
              Method: {method === "por_modified" ? "PoR Modified (you changed the outcome/confidence)" : "Manual (no PoR result)"}
            </p>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Admin Notes {isModified && "(required — explain override)"}
            </label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Reasoning for this resolution..."
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Evidence Summary</label>
            <Textarea
              value={evidenceSummary}
              onChange={(e) => setEvidenceSummary(e.target.value)}
              placeholder="Brief summary of key evidence..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || !outcome.trim()}
              className="h-9 rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition-colors hover:bg-green-600/90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm & Notify
            </button>
            <span className="text-[10px] text-muted-foreground">
              Will notify Lark + Telegram
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
