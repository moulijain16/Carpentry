"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { STATUSES } from "@/lib/domain";
import { STATUS_STYLES } from "@/lib/statusStyles";

const TABS = ["All", ...STATUSES] as const;

export default function DashboardFilters({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const activeStatus = params.get("status") ?? "All";
  const [query, setQuery] = useState(params.get("q") ?? "");

  // Debounced search — "search by name and order number both".
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (query === current) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");
      router.replace(`/admin?${next.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, params, router]);

  function selectStatus(status: string) {
    const next = new URLSearchParams(params.toString());
    if (status === "All") next.delete("status");
    else next.set("status", status);
    router.replace(`/admin?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-bark-400"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 103.4 9.83l3.63 3.64a1 1 0 001.42-1.42l-3.64-3.63A5.5 5.5 0 009 3.5zM5.5 9a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by customer name or order number"
          aria-label="Search enquiries by customer name or order number"
          className="field pl-11"
        />
      </div>

      {/* "Just click on the tab and see only those enquiries." */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex w-max gap-2">
          {TABS.map((tab) => {
            const active = activeStatus === tab;
            const activeClass =
              tab === "All"
                ? "bg-bark-800 text-white"
                : STATUS_STYLES[tab].tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => selectStatus(tab)}
                aria-pressed={active}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition ${
                  active
                    ? activeClass
                    : "border border-bark-200 bg-white text-bark-700 hover:bg-bark-100"
                }`}
              >
                {tab}
                <span
                  className={`ml-1.5 text-xs ${active ? "opacity-80" : "text-bark-400"}`}
                >
                  {counts[tab] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
