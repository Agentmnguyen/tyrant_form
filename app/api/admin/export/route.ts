import { NextResponse } from "next/server";
import { buildParticipationCsv, buildPlayersCsv } from "@/lib/csv";
import { getRosterAdminData } from "@/lib/rosterData";
import { assertAdminPin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    assertAdminPin(body.pin);
    const data = await getRosterAdminData();
    const exportType = body.exportType === "players" ? "players" : "participation";
    const csv = exportType === "players" ? buildPlayersCsv(data.players) : buildParticipationCsv(data.participationEntries);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=1474-event-roster-${exportType}.csv`
      }
    });
  } catch (error) {
    const unauthorized = error instanceof Error && error.name === "UnauthorizedError";
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to export CSV." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
