import { NextResponse } from "next/server";
import { getRosterAdminData, openEvent } from "@/lib/rosterData";
import { assertAdminPin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    assertAdminPin(body.pin);

    if (!body.eventId || typeof body.eventId !== "string") {
      return NextResponse.json({ ok: false, message: "Event ID is required." }, { status: 400 });
    }

    await openEvent(body.eventId, Boolean(body.lockExisting));
    const data = await getRosterAdminData();
    return NextResponse.json({ ok: true, data, message: "Event opened for public participation." });
  } catch (error) {
    const unauthorized = error instanceof Error && error.name === "UnauthorizedError";
    const conflict = error instanceof Error && error.name === "OpenEventConflictError";
    const notFound = error instanceof Error && error.name === "NotFoundError";
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to open event.",
        conflict: conflict && error instanceof Error ? (error as Error & { conflict?: unknown }).conflict : undefined
      },
      { status: unauthorized ? 401 : conflict ? 409 : notFound ? 404 : 500 }
    );
  }
}
