import { NextResponse } from "next/server";
import { getRosterAdminData } from "@/lib/rosterData";
import { assertAdminPin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    assertAdminPin(body.pin);
    const data = await getRosterAdminData();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const unauthorized = error instanceof Error && error.name === "UnauthorizedError";
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load roster data." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
