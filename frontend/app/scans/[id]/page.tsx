import ScanReportClient from "@/components/ScanReportClient";

interface ScanPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScanPage({ params }: ScanPageProps) {
  const { id } = await params;
  const scanId = Number(id);

  if (Number.isNaN(scanId)) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <section className="panel p-8">
          <p className="panel-title">Invalid Report ID</p>
          <p className="mt-3 text-sm text-slate-700">
            The requested scan id is not a number. Return to search and run a new scan.
          </p>
        </section>
      </main>
    );
  }

  return <ScanReportClient scanId={scanId} />;
}
