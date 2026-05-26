import { NextResponse } from "next/server";
import { getPublicOpenEventState } from "@/lib/rosterData";

export async function GET() {
  try {
    const data = await getPublicOpenEventState();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load the open event." },
      { status: 500 }
    );
  }
}
