"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
      className="shrink-0 rounded-lg border border-bark-50/25 px-3 py-1.5 text-xs font-semibold text-bark-100 transition hover:bg-bark-50/10 disabled:opacity-60"
    >
      {busy ? "…" : "Sign out"}
    </button>
  );
}
