import { NextResponse } from "next/server";
import { syncParticipationToGoogleSheets } from "@/lib/googleSheets";
import { getRosterAdminData, updateParticipationEntry, updateSheetSyncStatus } from "@/lib/rosterData";
import { assertAdminPin } from "@/lib/supabase";
import { validatePayload } from "@/lib/rosterValidation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    assertAdminPin(body.pin);

    if (!body.participationEntryId || typeof body.participationEntryId !== "string") {
      return NextResponse.json({ ok: false, message: "Participation entry ID is required." }, { status: 400 });
    }

    const validation = validatePayload(body.participation);

    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, message: Object.values(validation.fieldErrors)[0] || "Review the edited participation.", fieldErrors: validation.fieldErrors },
        { status: 400 }
      );
    }

    let entry = await updateParticipationEntry(body.participationEntryId, validation.data);

    try {
      entry = await updateSheetSyncStatus(entry.id, "synced");
      await syncParticipationToGoogleSheets(entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Sheets sync failed.";
      await updateSheetSyncStatus(entry.id, "sheet_sync_failed", message);
    }

    const data = await getRosterAdminData();
    return NextResponse.json({ ok: true, data, message: "Participation updated." });
  } catch (error) {
    const unauthorized = error instanceof Error && error.name === "UnauthorizedError";
    const notFound = error instanceof Error && error.name === "NotFoundError";
    const duplicate = error instanceof Error && error.name === "DuplicatePlayerError";
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to update participation." },
      { status: unauthorized ? 401 : notFound ? 404 : duplicate ? 409 : 500 }
    );
  }
}
