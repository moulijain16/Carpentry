import { NextResponse, type NextRequest } from "next/server";
import { getPhoto } from "@/lib/enquiries";
import { getSession } from "@/lib/session";

/** Reference photos are workshop-only, same as the rest of the order list. */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const photo =  await getPhoto(Number((await ctx.params).id));
  if (!photo)
    return NextResponse.json({ error: "No photo." }, { status: 404 });

  return new NextResponse(photo.data as unknown as BodyInit, {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
