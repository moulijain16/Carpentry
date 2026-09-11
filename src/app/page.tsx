import Link from "next/link";
import EnquiryForm from "@/components/EnquiryForm";

export default function HomePage() {
  return (
    <div className="min-h-full">
      <header className="border-b border-bark-800/20 bg-bark-800 text-bark-50">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-base font-bold">
              Gurpreet Furniture Works
            </p>
            <p className="truncate text-xs text-bark-200">
              Custom furniture, made to order
            </p>
          </div>
          <Link
            href="/login"
            className="shrink-0 rounded-lg border border-bark-50/25 px-3 py-1.5 text-xs font-semibold text-bark-100 transition hover:bg-bark-50/10"
          >
            Workshop login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-bark-900 sm:text-3xl">
            Tell us what you need made
          </h1>
          <p className="mt-2 text-bark-600">
            Fill in the details below and we will call you back to discuss the
            design, wood and price. Rough measurements are fine.
          </p>
        </div>

        <EnquiryForm />
      </main>

      <footer className="border-t border-bark-200 py-6 text-center text-xs text-bark-500">
        Gurpreet Furniture Works · Wardrobes, beds, kitchen units and more
      </footer>
    </div>
  );
}
