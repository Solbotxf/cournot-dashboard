import type { AdminMarket } from "@/lib/types";
import { toast } from "sonner";

const API_BASE = "/api/proxy";

interface AdminMarketsResponse {
  markets: AdminMarket[];
  total: number;
  page_num: number;
  page_size: number;
}

interface ResolveResponse {
  market: AdminMarket;
  notifications: {
    lark: boolean;
    telegram: boolean;
  };
}

class AdminApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "AdminApiError";
    this.code = code;
  }
}

async function adminFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new AdminApiError(res.status, `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.code === 4100) {
    toast.error("Invalid access code", { description: "Please re-enter your code." });
    throw new AdminApiError(4100, json.msg || "Invalid access code");
  }
  if (json.code === 4030) {
    toast.error("Admin access required");
    throw new AdminApiError(4030, json.msg || "Admin access required");
  }
  if (json.code !== 0) {
    toast.error(json.msg || "API error");
    throw new AdminApiError(json.code, json.msg || "API error");
  }
  return json.data as T;
}

export async function fetchMarkets(
  code: string,
  params: {
    status?: string;
    alert_level?: string;
    platform?: string;
    page_num?: number;
    page_size?: number;
    sort?: string;
    order?: "asc" | "desc";
  } = {}
): Promise<AdminMarketsResponse> {
  const qs = new URLSearchParams();
  qs.set("code", code);
  if (params.status) qs.set("status", params.status);
  if (params.alert_level) qs.set("alert_level", params.alert_level);
  if (params.platform) qs.set("platform", params.platform);
  qs.set("page_num", String(params.page_num ?? 1));
  qs.set("page_size", String(params.page_size ?? 20));
  if (params.sort) qs.set("sort", params.sort);
  if (params.order) qs.set("order", params.order);
  return adminFetch<AdminMarketsResponse>(`${API_BASE}/admin/markets?${qs.toString()}`);
}

export async function fetchMarket(code: string, id: string): Promise<{ market: AdminMarket }> {
  return adminFetch<{ market: AdminMarket }>(
    `${API_BASE}/admin/markets/${id}?code=${encodeURIComponent(code)}`
  );
}

export async function createMarket(
  code: string,
  data: {
    title: string;
    platform: string;
    platform_url?: string;
    description: string;
    question: string;
    start_time: string;
    end_time: string;
    resolve_time: string;
  }
): Promise<{ market: AdminMarket }> {
  return adminFetch<{ market: AdminMarket }>(`${API_BASE}/admin/markets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, ...data }),
  });
}

export async function updateMarket(
  code: string,
  id: string,
  data: Partial<AdminMarket>
): Promise<{ market: AdminMarket }> {
  return adminFetch<{ market: AdminMarket }>(`${API_BASE}/admin/markets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, ...data }),
  });
}

export async function resolveMarket(
  code: string,
  id: string,
  data: {
    outcome: string;
    confidence: number;
    method: "por" | "manual" | "por_modified";
    por_root?: string | null;
    admin_notes?: string | null;
    evidence_summary?: string | null;
  }
): Promise<ResolveResponse> {
  return adminFetch<ResolveResponse>(`${API_BASE}/admin/markets/${id}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, ...data }),
  });
}
