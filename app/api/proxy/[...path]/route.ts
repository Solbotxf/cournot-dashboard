import { NextRequest, NextResponse } from "next/server";

const UPSTREAM = process.env.UPSTREAM_API_BASE ?? "https://dev-interface.cournot.ai/play/polymarket";
const TIMEOUT_MS = 30_000; // 30s timeout for upstream requests

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const search = request.nextUrl.search;
  const url = `${UPSTREAM}/${path}${search}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Upstream request timed out" },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upstream request failed" },
      { status: 502 }
    );
  }
}
