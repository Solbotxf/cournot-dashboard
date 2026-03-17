"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { fetchPublicMarket } from "@/lib/admin-api";
import type { AdminMarket } from "@/lib/types";
import { MarketDetail } from "@/components/admin/market-detail";
import { AiResultDetail } from "@/components/admin/ai-result-detail";
import { Loader2 } from "lucide-react";

export default function PublicMarketDetailPage() {
  const params = useParams<{ id: string }>();
  const [market, setMarket] = useState<AdminMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError(null);
    try {
      const m = await fetchPublicMarket(Number(params.id));
      if (!m) {
        setError("Market not found");
      } else if (m.status !== "resolved") {
        setError("This market is not yet resolved and is not available for public viewing.");
        setMarket(null);
        setLoading(false);
        return;
      }
      setMarket(m);
    } catch {
      setError("Failed to load market");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {error || "Market not found"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-xs text-muted-foreground">
        Markets &rarr; <span className="text-foreground">{market.title}</span>
      </div>

      <MarketDetail market={market} />

      {market.ai_result && (
        <AiResultDetail
          aiResult={market.ai_result}
          aiPrompt={market.ai_prompt || undefined}
          resolveReasoning={market.resolve_reasoning || undefined}
        />
      )}
    </div>
  );
}
