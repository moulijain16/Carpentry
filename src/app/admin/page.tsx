import Link from "next/link";
import { Suspense } from "react";
import DashboardFilters from "@/components/DashboardFilters";
import EnquiryCard from "@/components/EnquiryCard";
import { listEnquiries, statusCounts } from "@/lib/enquiries";
import { deliveryUrgency } from "@/lib/domain";
import { relativeDays } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const enquiries =  await listEnquiries({ status, q });
  const counts = await statusCounts();

  // "Every morning I want to see which orders are due for delivery in the next
  //  few days so I don't break any promises to customers."
  const dueSoon =  (await listEnquiries())
    .map((enquiry) => ({ enquiry, urgency: deliveryUrgency(enquiry) }))
    .filter((row) => row.urgency !== null)
    .sort(
      (a, b) =>
        (a.enquiry.promisedDeliveryDate ?? "").localeCompare(
          b.enquiry.promisedDeliveryDate ?? "",
        ),
    );

  return (
    <div className="space-y-4">
      {dueSoon.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <span aria-hidden>⏰</span> Due in the next few days
          </h2>
          <ul className="mt-2.5 divide-y divide-amber-200/70">
            {dueSoon.map(({ enquiry, urgency }) => (
              <li key={enquiry.id}>
                <Link
                  href={`/admin/${enquiry.id}`}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-semibold text-amber-950">
                    #{enquiry.id} · {enquiry.customerName}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                      urgency!.level === "overdue"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-200 text-amber-900"
                    }`}
                  >
                    {relativeDays(urgency!.days)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Suspense fallback={<div className="h-28" />}>
        <DashboardFilters counts={counts} />
      </Suspense>

      {enquiries.length === 0 ? (
        <p className="card p-8 text-center text-sm text-bark-500">
          {q || (status && status !== "All")
            ? "No enquiries match this filter."
            : "No enquiries yet. They will appear here as soon as customers send them."}
        </p>
      ) : (
        <ul className="space-y-3">
          {enquiries.map((enquiry) => (
            <EnquiryCard key={enquiry.id} enquiry={enquiry} />
          ))}
        </ul>
      )}
    </div>
  );
}
