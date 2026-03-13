"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/lib/role";
import { fetchMarkets } from "@/lib/admin-api";
import type { AdminMarket, MarketStatus, AlertLevel } from "@/lib/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "Alerted", value: "ALERTED" },
  { label: "Monitoring", value: "MONITORING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "All", value: "" },
];

function statusColor(s: MarketStatus): string {
  switch (s) {
    case "ALERTED": return "text-amber-400";
    case "MONITORING": return "text-green-400";
    case "ACTIVE": return "text-blue-400";
    case "RESOLVING": return "text-purple-400";
    case "RESOLVED": return "text-muted-foreground";
    case "EXPIRED": return "text-muted-foreground/60";
    case "CANCELLED": return "text-muted-foreground/60";
    default: return "";
  }
}

function alertBadge(level: AlertLevel) {
  if (level === "none") return <span className="text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    low: "bg-yellow-500/10 text-yellow-500",
    medium: "bg-orange-500/10 text-orange-500",
    high: "bg-red-500/10 text-red-500",
    critical: "bg-red-600/20 text-red-400",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px]", colors[level])}>
      {level.toUpperCase()}
    </Badge>
  );
}

function platformBadge(platform: string) {
  const colors: Record<string, string> = {
    polymarket: "bg-blue-500/10 text-blue-400",
    kalshi: "bg-green-500/10 text-green-400",
    limitless: "bg-purple-500/10 text-purple-400",
    custom: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px]", colors[platform] ?? colors.custom)}>
      {platform}
    </Badge>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function MarketTable() {
  const { accessCode } = useRole();
  const router = useRouter();
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALERTED");
  const pageSize = 20;

  const load = useCallback(async () => {
    if (!accessCode) return;
    setLoading(true);
    try {
      const data = await fetchMarkets(accessCode, {
        status: statusFilter || undefined,
        page_num: page,
        page_size: pageSize,
        sort: "resolve_time",
        order: "asc",
      });
      setMarkets(data.markets);
      setTotal(data.total);
    } catch {
      // Error handled by admin-api
    } finally {
      setLoading(false);
    }
  }, [accessCode, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-1 rounded-lg bg-muted/30 p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
              statusFilter === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alert</TableHead>
                <TableHead>Resolve By</TableHead>
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
                      m.status === "ALERTED" && "bg-red-500/5"
                    )}
                    onClick={() => router.push(`/admin/markets/${m.id}`)}
                  >
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {m.title}
                    </TableCell>
                    <TableCell>{platformBadge(m.platform)}</TableCell>
                    <TableCell>
                      <span className={statusColor(m.status)}>{m.status}</span>
                    </TableCell>
                    <TableCell>{alertBadge(m.alert_level)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(m.resolve_time)}
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
