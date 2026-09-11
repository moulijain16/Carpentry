import { NextResponse, type NextRequest } from "next/server";
import { createEnquiry, listEnquiries, statusCounts } from "@/lib/enquiries";
import { parseEnquiryForm } from "@/lib/validation";
import { notifyNewEnquiry } from "@/lib/notify";
import { getSession } from "@/lib/session";

/** Public: a customer submits an enquiry. */
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const { data, errors } = await parseEnquiryForm(form);
  if (errors) return NextResponse.json({ errors }, { status: 422 });

  const enquiry = await createEnquiry(data!);
  // Fire-and-forget so the customer isn't waiting on the SMS provider.
  void notifyNewEnquiry(enquiry).catch(() => {});

  return NextResponse.json({ id: enquiry.id }, { status: 201 });
}

/** Admin: the enquiry list, newest first. */
export async function GET(request: NextRequest) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = request.nextUrl;
  return NextResponse.json({
    enquiries: await listEnquiries({
      status: searchParams.get("status") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    }),
    counts: statusCounts(),
  });
}
