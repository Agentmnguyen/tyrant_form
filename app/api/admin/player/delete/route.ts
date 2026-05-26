import { NextResponse } from "next/server";
import { isGoogleSheetsSyncEnabled, markPlayerDeletedInGoogleSheets } from "@/lib/googleSheets";
import { deletePlayer, getRosterAdminData } from "@/lib/rosterData";
import { assertAdminPin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    assertAdminPin(body.pin);

    if (!body.playerUuid || typeof body.playerUuid !== "string") {
      return NextResponse.json({ ok: false, message: "Player UUID is required." }, { status: 400 });
    }

    const deletedPlayer = await deletePlayer(body.playerUuid);
    let sheetWarning = "";

    if (isGoogleSheetsSyncEnabled()) {
      try {
        await markPlayerDeletedInGoogleSheets(deletedPlayer);
      } catch (error) {
        sheetWarning = error instanceof Error ? error.message : "Google Sheets delete marker failed.";
      }
    }

    const data = await getRosterAdminData();
    const message = sheetWarning
      ? `Player deleted. Google Sheets delete marker failed: ${sheetWarning}`
      : "Player deleted.";

    return NextResponse.json({ ok: true, data, message });
  } catch (error) {
    const unauthorized = error instanceof Error && error.name === "UnauthorizedError";
    const notFound = error instanceof Error && error.name === "NotFoundError";
    const blocked = error instanceof Error && error.name === "PlayerHasParticipationError";
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to delete player." },
      { status: unauthorized ? 401 : notFound ? 404 : blocked ? 409 : 500 }
    );
  }
}
