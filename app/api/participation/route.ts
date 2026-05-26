import { NextResponse } from "next/server";
import { syncParticipationToGoogleSheets } from "@/lib/googleSheets";
import { submitParticipation, updateSheetSyncStatus } from "@/lib/rosterData";
import { validatePayload } from "@/lib/rosterValidation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validation = validatePayload(body);

  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, message: Object.values(validation.fieldErrors)[0] || "Review your participation details.", fieldErrors: validation.fieldErrors },
      { status: 400 }
    );
  }

  try {
    let entry = await submitParticipation(validation.data);

    try {
      entry = await updateSheetSyncStatus(entry.id, "synced");
      await syncParticipationToGoogleSheets(entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Sheets sync failed.";
      entry = await updateSheetSyncStatus(entry.id, "sheet_sync_failed", message);
    }

    return NextResponse.json({ ok: true, data: { participationEntry: entry } });
  } catch (error) {
    const closed = error instanceof Error && error.name === "SubmissionsClosedError";
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to save participation."
      },
      { status: closed ? 403 : 500 }
    );
  }
}
