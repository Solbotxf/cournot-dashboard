import { CaseDetailClient } from "@/components/cases/case-detail-client";

// Required for static export with dynamic routes
export function generateStaticParams() {
  return [];
}

// Enable dynamic rendering
export const dynamic = "force-dynamic";

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  return <CaseDetailClient eventId={params.id} />;
}
