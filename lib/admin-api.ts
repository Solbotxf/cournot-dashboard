import type { AdminMarket } from "@/lib/types";
import { toast } from "sonner";

const API_BASE = "/api/proxy";

interface ListMarketsResponse {
  markets: AdminMarket[];
  total: number;
}

class AdminApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminApiError";
  }
}

async function adminFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      if (text) msg = text;
    } catch { /* ignore */ }
    toast.error(msg);
    throw new AdminApiError(msg);
  }
  const json = await res.json();
  // Backend returns errors as { error: "message" } or plain error strings
  if (json.error) {
    const errMsg = typeof json.error === "string" ? json.error : "API error";
    toast.error(errMsg);
    throw new AdminApiError(errMsg);
  }
  return json as T;
}

export async function checkIsAdmin(code: string): Promise<boolean> {
  const json = await adminFetch<{ is_admin: boolean }>(
    `${API_BASE}/markets/is_admin`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }
  );
  return json.is_admin;
}

export async function fetchMarkets(
  code: string,
  params: {
    page_num?: number;
    page_size?: number;
    sort?: string;
    order?: "asc" | "desc";
  } = {}
): Promise<ListMarketsResponse> {
  const qs = new URLSearchParams();
  qs.set("code", code);
  qs.set("page_num", String(params.page_num ?? 1));
  qs.set("page_size", String(params.page_size ?? 20));
  if (params.sort) qs.set("sort", params.sort);
  if (params.order) qs.set("order", params.order);
  return adminFetch<ListMarketsResponse>(
    `${API_BASE}/markets/list?${qs.toString()}`
  );
}

export async function fetchMarket(
  code: string,
  id: number
): Promise<AdminMarket | null> {
  // No single-market endpoint — fetch list and find by ID
  const data = await fetchMarkets(code, { page_size: 100 });
  return data.markets.find((m) => m.id === id) ?? null;
}

export async function createMarket(
  code: string,
  data: {
    title: string;
    description: string;
    platform_url?: string;
    start_time: string;
    end_time: string;
  }
): Promise<{ market: AdminMarket }> {
  return adminFetch<{ market: AdminMarket }>(`${API_BASE}/markets/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, ...data }),
  });
}

export async function updateMarket(
  code: string,
  id: number,
  data: {
    title?: string;
    description?: string;
    platform_url?: string;
    start_time?: string;
    end_time?: string;
  }
): Promise<{ market: AdminMarket }> {
  return adminFetch<{ market: AdminMarket }>(`${API_BASE}/markets/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, id, ...data }),
  });
}

export async function updateAiResult(
  code: string,
  id: number,
  aiResult: string
): Promise<{ market: AdminMarket }> {
  return adminFetch<{ market: AdminMarket }>(
    `${API_BASE}/markets/update_ai_result`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, id, ai_result: aiResult }),
    }
  );
}
