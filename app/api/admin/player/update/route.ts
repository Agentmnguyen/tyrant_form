import { NextResponse } from "next/server";
import { getRosterAdminData, updatePlayer } from "@/lib/rosterData";
import { isAlliance } from "@/lib/rosterConfig";
import { assertAdminPin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    assertAdminPin(body.pin);

    if (!body.playerUuid || typeof body.playerUuid !== "string") {
      return NextResponse.json({ ok: false, message: "Player UUID is required." }, { status: 400 });
    }

    const player = body.player || {};
    const playerGameId = String(player.playerGameId || "").trim();
    const playerName = String(player.playerName || "").trim();
    const alliance = String(player.alliance || "");

    if (!playerGameId || !playerName || !isAlliance(alliance)) {
      return NextResponse.json({ ok: false, message: "Player name, Player ID, and alliance are required." }, { status: 400 });
    }

    await updatePlayer(body.playerUuid, { playerGameId, playerName, alliance });
    const data = await getRosterAdminData();
    return NextResponse.json({ ok: true, data, message: "Player updated." });
  } catch (error) {
    const unauthorized = error instanceof Error && error.name === "UnauthorizedError";
    const notFound = error instanceof Error && error.name === "NotFoundError";
    const duplicate = error instanceof Error && error.name === "DuplicatePlayerError";
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to update player." },
      { status: unauthorized ? 401 : notFound ? 404 : duplicate ? 409 : 500 }
    );
  }
}
