import { NextResponse } from "next/server";
import { syncParticipationToGoogleSheets } from "@/lib/googleSheets";
import { getParticipationEntry, getRosterAdminData, updateSheetSyncStatus } from "@/lib/rosterData";
import { assertAdminPin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    assertAdminPin(body.pin);

    if (!body.participationEntryId || typeof body.participationEntryId !== "string") {
      return NextResponse.json({ ok: false, message: "Participation entry ID is required." }, { status: 400 });
    }

    const entry = await getParticipationEntry(body.participationEntryId);

    try {
      const syncedEntry = await updateSheetSyncStatus(entry.id, "synced");
      await syncParticipationToGoogleSheets(syncedEntry);
      const data = await getRosterAdminData();
      return NextResponse.json({ ok: true, data, message: "Google Sheets sync completed." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Sheets sync failed.";
      await updateSheetSyncStatus(entry.id, "sheet_sync_failed", message);
      const data = await getRosterAdminData();
      return NextResponse.json({ ok: false, data, message }, { status: 502 });
    }
  } catch (error) {
    const unauthorized = error instanceof Error && error.name === "UnauthorizedError";
    const notFound = error instanceof Error && error.name === "NotFoundError";
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to retry Google Sheets sync." },
      { status: unauthorized ? 401 : notFound ? 404 : 500 }
    );
  }
}
