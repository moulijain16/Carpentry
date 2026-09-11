import { NextResponse, type NextRequest } from "next/server";
import {
  RuleError,
  changeStatus,
  deleteEnquiry,
  getEnquiry,
  statusHistory,
  updateEnquiry,
  type UpdatableField,
} from "@/lib/enquiries";
import { STATUSES, type Status } from "@/lib/domain";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

async function guard(): Promise<NextResponse | null> {
  if (!(await getSession()))
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return null;
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const denied = await guard();
  if (denied) return denied;

  const id = Number((await ctx.params).id);
  const enquiry =  await getEnquiry(id);
  if (!enquiry)
    return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  return NextResponse.json({ enquiry, history:  await statusHistory(id) });
}

/** Edit fields, and/or move the enquiry to the next status. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const denied = await guard();
  if (denied) return denied;

  const id = Number((await ctx.params).id);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { status, items, ...fields } = body as {
    status?: string;
    items?: never[];
    [k: string]: unknown;
  };

  try {
    let enquiry;
    if (status !== undefined) {
      if (!(STATUSES as readonly string[]).includes(status))
        return NextResponse.json({ error: "Unknown status." }, { status: 400 });
      enquiry =  await changeStatus(
        id,
        status as Status,
        fields as Partial<Record<UpdatableField, unknown>>,
      );
    } else {
      enquiry =  await updateEnquiry(
        id,
        fields as Partial<Record<UpdatableField, unknown>>,
        items as never,
      );
    }
    return NextResponse.json({ enquiry, history:  await statusHistory(id) });
  } catch (err) {
    if (err instanceof RuleError)
      return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}

/** "Delete means it's gone completely." */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const denied = await guard();
  if (denied) return denied;

  const id = Number((await ctx.params).id);
  if (! (await deleteEnquiry(id)))
    return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
