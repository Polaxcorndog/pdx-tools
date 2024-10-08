import { newSessionCookie } from "@/server-lib/auth/session";
import { DbRoute, table, withDb } from "@/server-lib/db";
import { getEnv } from "@/server-lib/env";
import { ValidationError } from "@/server-lib/errors";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { fetchOk, fetchOkJson } from "@/lib/fetch";
import { genId } from "@/server-lib/id";
import { withCore } from "@/server-lib/middleware";
import { check } from "@/lib/isPresent";
import { STEAM_URL } from "@/lib/steam";

const handler = async (
  req: NextRequest,
  { dbConn, searchParams }: DbRoute & { searchParams: URLSearchParams },
) => {
  const steamUid = await loginVerify(searchParams);
  const steamName = await getPlayerName(steamUid);

  const db = await dbConn;

  const genUserId = genId(12);
  const users = await db
    .insert(table.users)
    .values({
      userId: genUserId,
      steamId: steamUid,
      steamName: steamName,
    })
    .onConflictDoUpdate({
      target: table.users.steamId,
      set: { steamName: sql.raw(`excluded.${table.users.steamName.name}`) },
    })
    .returning();

  const user = check(users.at(0), "expected user");
  const cookie = await newSessionCookie({
    userId: user.userId,
    steamId: steamUid,
    account: user?.account ?? "free",
  });

  const dest = process.env.NEXT_PUBLIC_EXTERNAL_ADDRESS ?? "https://pdx.tools";
  const response = NextResponse.redirect(dest, 302);
  response.cookies.set(cookie);
  return response;
};

export const GET = (req: NextRequest) => {
  const searchParams = new URL(req.url).searchParams;
  return withCore(withDb(handler))(req, { searchParams });
};

async function loginVerify(data: URLSearchParams) {
  data.set("openid.mode", "check_authentication");
  const claimId = data.get("openid.claimed_id");
  if (!claimId) {
    throw new Error("openid.claimed_id");
  }

  const url = new URL(getSingleInstance(claimId));
  const uid = url.pathname.substring(url.pathname.lastIndexOf("/") + 1);

  const response = await fetchOk(STEAM_URL, {
    method: "POST",
    body: data,
  });

  const body = await response.text();
  if (body.indexOf("is_valid:true") === -1) {
    throw new ValidationError(`steam unable to validate request: ${body}`);
  } else {
    return uid;
  }
}

async function getPlayerName(steamUid: string) {
  const apiKey = getEnv("STEAM_API_KEY");
  const params = new URLSearchParams([
    ["key", apiKey],
    ["steamids", steamUid],
  ]);
  const body = await fetchOkJson(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002?${params}`,
  );
  const name = body?.response?.players?.[0]?.personaname;
  if (typeof name !== "string") {
    throw new ValidationError("could not retrieve player name from steam");
  } else {
    return name;
  }
}

function getSingleInstance(data: string | string[]): string {
  if (Array.isArray(data)) {
    throw new ValidationError("expected single instance");
  } else {
    return data;
  }
}
