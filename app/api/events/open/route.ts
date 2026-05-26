import { NextResponse } from "next/server";
import { getPublicOpenEventsState } from "@/lib/rosterData";

export async function GET() {
  try {
    const data = await getPublicOpenEventsState();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load open events." },
      { status: 500 }
    );
  }
}
