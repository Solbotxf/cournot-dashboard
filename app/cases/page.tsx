import { CaseTableView } from "@/components/cases/case-table";
import { mockCases } from "@/lib/mock-data";

export default function CasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Cases</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Browse market cases — compare official source outcomes vs AI Oracle results
        </p>
      </div>
      <CaseTableView cases={mockCases} />
    </div>
  );
}
