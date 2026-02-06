import { CaseDetailClient } from "@/components/cases/case-detail-client";

const API_BASE = "https://dev-interface.cournot.ai/play/polymarket";

// Fetch event IDs at build time for static export
export async function generateStaticParams() {
  try {
    // Fetch first page of events to get IDs for static generation
    const res = await fetch(`${API_BASE}/events?page_num=1&page_size=100`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      console.warn("Failed to fetch events for static params, returning empty array");
      return [];
    }

    const response = await res.json();
    const events = response.data?.events ?? [];

    return events.map((event: { event_id: number }) => ({
      id: String(event.event_id),
    }));
  } catch (error) {
    console.warn("Error fetching events for static params:", error);
    return [];
  }
}

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  return <CaseDetailClient eventId={params.id} />;
}
