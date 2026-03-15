"use client";

import type { AdminMarket } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function MarketDetail({ market }: { market: AdminMarket }) {
  const isResolved = !!market.resolve_time;

  return (
    <div className="space-y-4">
      {/* Info card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{market.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{market.description}</p>
              {market.platform_url && (
                <a
                  href={market.platform_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  View on platform <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {isResolved ? (
                <Badge variant="outline" className="text-xs text-muted-foreground">Resolved</Badge>
              ) : market.ai_outcome ? (
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400">Has AI Result</Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400">Active</Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Start</span>
              <p>{formatDate(market.start_time)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">End</span>
              <p>{formatDate(market.end_time)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Created</span>
              <p>{formatDate(market.created_time)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Created By</span>
              <p className="font-mono text-xs truncate">{market.user_id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Result card (if available) */}
      {market.ai_outcome && (
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-purple-400 mb-2">AI Result</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Outcome</span>
                <p className="text-lg font-bold">{market.ai_outcome}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Result Time</span>
                <p>{formatDate(market.ai_result_time)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Resolve Time</span>
                <p>{market.resolve_time ? formatDate(market.resolve_time) : "—"}</p>
              </div>
            </div>
            {market.resolve_reasoning && (
              <div className="mt-3">
                <span className="text-xs text-muted-foreground">Reasoning</span>
                <p className="text-sm text-muted-foreground mt-1">{market.resolve_reasoning}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
