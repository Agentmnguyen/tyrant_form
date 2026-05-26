import { NextResponse } from "next/server";
import { isGoogleSheetsSyncEnabled, markParticipationDeletedInGoogleSheets } from "@/lib/googleSheets";
import { deleteParticipationEntry, getRosterAdminData } from "@/lib/rosterData";
import { assertAdminPin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    assertAdminPin(body.pin);

    if (!body.participationEntryId || typeof body.participationEntryId !== "string") {
      return NextResponse.json({ ok: false, message: "Participation entry ID is required." }, { status: 400 });
    }

    const deletedEntry = await deleteParticipationEntry(body.participationEntryId);
    let sheetWarning = "";

    if (isGoogleSheetsSyncEnabled()) {
      try {
        await markParticipationDeletedInGoogleSheets(deletedEntry);
      } catch (error) {
        sheetWarning = error instanceof Error ? error.message : "Google Sheets delete marker failed.";
      }
    }

    const data = await getRosterAdminData();
    const message = sheetWarning
      ? `Participation deleted. Google Sheets delete marker failed: ${sheetWarning}`
      : "Participation deleted.";

    return NextResponse.json({ ok: true, data, message });
  } catch (error) {
    const unauthorized = error instanceof Error && error.name === "UnauthorizedError";
    const notFound = error instanceof Error && error.name === "NotFoundError";
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to delete participation." },
      { status: unauthorized ? 401 : notFound ? 404 : 500 }
    );
  }
}
