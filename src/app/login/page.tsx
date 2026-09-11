import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Workshop login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-bark-100 px-4 py-10">
      <main className="mx-auto w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-bark-800 text-2xl">
            🪚
          </div>
          <h1 className="mt-4 text-xl font-bold text-bark-900">
            Workshop login
          </h1>
          <p className="mt-1 text-sm text-bark-600">
            Sign in to see and manage enquiries.
          </p>
        </div>

        <div className="card p-6">
          <LoginForm next={next ?? "/admin"} />
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="font-semibold text-bark-600 hover:underline">
            ← Back to the enquiry form
          </Link>
        </p>
      </main>
    </div>
  );
}
