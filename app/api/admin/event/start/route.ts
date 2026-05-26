import { NextResponse } from "next/server";
import { ensureEventSheet } from "@/lib/googleSheets";
import { getRosterAdminData, startNewEvent } from "@/lib/rosterData";
import { isEventType } from "@/lib/rosterConfig";
import { assertAdminPin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    assertAdminPin(body.pin);

    if (!body.eventType || typeof body.eventType !== "string" || !isEventType(body.eventType)) {
      return NextResponse.json({ ok: false, message: "Choose a valid event type." }, { status: 400 });
    }

    const event = await startNewEvent(body.eventType);

    try {
      await ensureEventSheet(event);
    } catch {
      // Future participation syncs also ensure tabs, so sheet setup remains best-effort here.
    }

    const data = await getRosterAdminData();
    return NextResponse.json({ ok: true, data, message: `${event.name} started as a draft.` });
  } catch (error) {
    const unauthorized = error instanceof Error && error.name === "UnauthorizedError";
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to start event." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
