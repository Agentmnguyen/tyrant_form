import { NextResponse } from "next/server";
import { getRosterAdminData, lockEvent } from "@/lib/rosterData";
import { assertAdminPin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    assertAdminPin(body.pin);

    if (!body.eventId || typeof body.eventId !== "string") {
      return NextResponse.json({ ok: false, message: "Event ID is required." }, { status: 400 });
    }

    await lockEvent(body.eventId);
    const data = await getRosterAdminData();
    return NextResponse.json({ ok: true, data, message: "Event locked." });
  } catch (error) {
    const unauthorized = error instanceof Error && error.name === "UnauthorizedError";
    const notFound = error instanceof Error && error.name === "NotFoundError";
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to lock event." },
      { status: unauthorized ? 401 : notFound ? 404 : 500 }
    );
  }
}
