import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export const metadata = { title: "Enquiries — Gurpreet Furniture Works" };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-bark-900/20 bg-bark-800 text-bark-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="min-w-0">
            <p className="truncate text-base font-bold">Workshop enquiries</p>
            <p className="truncate text-xs text-bark-200">
              Gurpreet Furniture Works
            </p>
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4 pb-16">{children}</main>
    </div>
  );
}
