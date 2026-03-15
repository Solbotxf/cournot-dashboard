"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/lib/role";
import { fetchMarkets } from "@/lib/admin-api";
import type { AdminMarket } from "@/lib/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SortField = "created_time" | "end_time" | "start_time";

const SORT_OPTIONS: { label: string; value: SortField }[] = [
  { label: "Newest", value: "created_time" },
  { label: "End Time", value: "end_time" },
  { label: "Start Time", value: "start_time" },
];

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function statusBadge(market: AdminMarket) {
  if (market.resolve_time) {
    return <Badge variant="outline" className="text-[10px] text-muted-foreground">Resolved</Badge>;
  }
  if (market.ai_outcome) {
    return <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400">Has AI Result</Badge>;
  }
  if (market.ai_prompt) {
    return <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400">Prompted</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400">Active</Badge>;
}

export function MarketTable() {
  const { accessCode } = useRole();
  const router = useRouter();
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortField>("created_time");
  const pageSize = 20;

  const load = useCallback(async () => {
    if (!accessCode) return;
    setLoading(true);
    try {
      const data = await fetchMarkets(accessCode, {
        page_num: page,
        page_size: pageSize,
        sort,
        order: "desc",
      });
      setMarkets(data.markets);
      setTotal(data.total);
    } catch {
      // Error handled by admin-api
    } finally {
      setLoading(false);
    }
  }, [accessCode, sort, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Sort tabs */}
      <div className="flex gap-1 rounded-lg bg-muted/30 p-1 w-fit">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setSort(opt.value); setPage(1); }}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
              sort === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI Outcome</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : markets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No markets found
                  </TableCell>
                </TableRow>
              ) : (
                markets.map((m) => (
                  <TableRow
                    key={m.id}
                    className={cn(
                      "cursor-pointer",
                      m.ai_outcome && !m.resolve_time && "bg-purple-500/5"
                    )}
                    onClick={() => router.push(`/admin/markets/${m.id}`)}
                  >
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {m.id}
                    </TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {m.title}
                    </TableCell>
                    <TableCell>{statusBadge(m)}</TableCell>
                    <TableCell>
                      {m.ai_outcome ? (
                        <span className="font-semibold">{m.ai_outcome}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(m.end_time)}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/markets/${m.id}`); }}
                        className="text-xs text-primary hover:underline"
                      >
                        View
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{total} markets total</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
