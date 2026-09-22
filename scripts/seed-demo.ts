/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Seeds a runnable demo on the local stack: an owner business with screens (one already paired to
 * a player), a separate advertiser business, and one ad request waiting for the owner's decision.
 *
 * Idempotent — re-running signs the same accounts back in and skips whatever already exists, so it
 * is safe to run repeatedly against the same database.
 *
 * Needs the local stack (npm run db:up; npm run db:migrate).
 * Run with: npm run seed:demo
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { formatPairingCode } from "@proyecta/common";

const API = process.env.PROYECTA_API ?? "http://localhost:3000";
const PASSWORD = "proyecta123";

/** Fixed so the browser player at /?hw=<id> comes up already linked and playing. */
const PLAYER_HW_ID = "demo-player-1";

type Session = { accessToken: string; workspace?: { accessKeyId: string } };
type Auth = { token: string; workspace: string };

/** tRPC routes queries over GET (input in the query string) and mutations over POST. */
async function call<T>(
  method: "GET" | "POST",
  path: string,
  input: unknown,
  auth?: Auth
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) {
    headers.authorization = `Bearer ${auth.token}`;
    headers["x-workspace"] = auth.workspace;
  }
  const url =
    method === "GET"
      ? `${API}/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`
      : `${API}/trpc/${path}`;
  const response = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(input) : undefined
  });
  const body = (await response.json()) as {
    result?: { data: T };
    error?: { message: string; data?: { code?: string } };
  };
  if (!response.ok || body.error) {
    const detail = body.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`${path}: ${detail}`);
  }
  return body.result!.data;
}

const trpc = <T>(path: string, input: unknown, auth?: Auth): Promise<T> =>
  call<T>("POST", path, input, auth);
const query = <T>(path: string, input: unknown, auth?: Auth): Promise<T> =>
  call<T>("GET", path, input, auth);

/**
 * Signs in when the account already exists, signs up the first time. `signUp` hands back the
 * workspace it just created; `signIn` only returns tokens, so the workspace is looked up.
 */
async function account(name: string, businessName: string, email: string): Promise<Auth> {
  let session: Session;
  try {
    session = await trpc<Session>("auth.signIn", { email, password: PASSWORD });
  } catch {
    session = await trpc<Session>("auth.signUp", {
      name,
      businessName,
      email,
      password: PASSWORD
    });
  }
  const token = session.accessToken;
  if (session.workspace?.accessKeyId) return { token, workspace: session.workspace.accessKeyId };

  const workspaces = await query<{ accessKeyId: string }[]>("workspaces.list", undefined, {
    token,
    workspace: ""
  });
  if (!workspaces.length) throw new Error(`${email} has no workspace`);
  return { token, workspace: workspaces[0].accessKeyId };
}

type Screen = { id: string; name: string };

/**
 * Every field that `isScreenComplete` requires is set, so the screen is catalog-eligible and its
 * plays are billable.
 */
async function screen(
  auth: Auth,
  existing: Screen[],
  fields: Record<string, unknown> & { name: string }
): Promise<Screen> {
  const input = {
    availableDays: [1, 2, 3, 4, 5, 6, 7],
    startTime: "00:00",
    endTime: "23:59",
    ratePerFiveSecondsDollars: 0.75,
    ...fields
  };
  // Converge rather than skip, so a re-run repairs a screen left incomplete by an earlier run.
  const already = existing.find((s) => s.name === fields.name);
  if (already) return trpc<Screen>("screens.update", { ...input, id: already.id }, auth);
  return trpc<Screen>("screens.create", input, auth);
}

/** One of the committed house ads (design/assets/house-ads), so the demo ad looks like a real ad. */
async function uploadHouseAd(auth: Auth, name: string): Promise<{ id: string; status: string }> {
  const file = fileURLToPath(
    new URL("../design/assets/house-ads/anunciate-aqui-1920x1080.webp", import.meta.url)
  );
  const params = new URLSearchParams({ fileName: `${name}.webp`, name, durationMs: "10000" });
  const response = await fetch(`${API}/uploads/assets?${params}`, {
    method: "POST",
    headers: {
      "content-type": "image/webp",
      authorization: `Bearer ${auth.token}`,
      "x-workspace": auth.workspace
    },
    body: new Uint8Array(readFileSync(file))
  });
  const payload = (await response.json()) as { asset?: { id: string; status: string } };
  if (!response.ok || !payload.asset) {
    throw new Error(`asset upload failed: ${JSON.stringify(payload)}`);
  }
  return payload.asset;
}

/** Renditions are prepared in the background; an ad can only use a READY asset. */
async function waitForReady(auth: Auth, assetId: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    const assets = await query<{ id: string; status: string }[]>("assets.list", {}, auth);
    const asset = assets.find((a) => a.id === assetId);
    if (asset?.status === "READY") return;
    if (asset?.status === "FAILED") throw new Error("asset rendition failed");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("asset did not become READY in time");
}

function isoDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const ownerEmail = "owner@proyecta.local";
  const advertiserEmail = "advertiser@proyecta.local";

  const owner = await account("Rosa Almonte", "Vallas del Caribe", ownerEmail);
  const { screens: ownerScreens } = await query<{ screens: Screen[] }>(
    "screens.list",
    { archived: false },
    owner
  );

  const malecon = await screen(owner, ownerScreens, {
    name: "Malecón Santo Domingo",
    city: "Santo Domingo",
    placeType: "BILLBOARD",
    environment: "OUTDOOR",
    orientation: "LANDSCAPE",
    latitude: 18.4655,
    longitude: -69.9156,
    resolution: "1920x1080"
  });
  await screen(owner, ownerScreens, {
    name: "Plaza Santiago",
    city: "Santiago",
    placeType: "MALL",
    environment: "INDOOR",
    orientation: "LANDSCAPE",
    latitude: 19.4517,
    longitude: -70.697,
    resolution: "1920x1080"
  });

  // Register the demo device and link it, so the player is already on air.
  const registered = (await (
    await fetch(`${API}/device/v1/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hwId: PLAYER_HW_ID, shell: "BROWSER", resolution: "1920x1080" })
    })
  ).json()) as { code: string };
  const availability = await query<{ available: boolean; reason?: string }>(
    "screens.checkCode",
    { code: registered.code },
    owner
  );
  if (availability.available) {
    await trpc("screens.link", { screenId: malecon.id, code: registered.code }, owner);
  }

  // A separate business, so its plays are billable rather than house plays.
  const advertiser = await account("Ana Peralta", "Café Aroma", advertiserEmail);
  const ads = await query<{ id: string; name: string }[]>("ads.list", {}, advertiser);
  if (!ads.some((a) => a.name === "Promo Café Aroma")) {
    const asset = await uploadHouseAd(advertiser, "Promo Café Aroma");
    await waitForReady(advertiser, asset.id);
    await trpc<{ id: string; name: string }>(
      "ads.create",
      {
        name: "Promo Café Aroma",
        assetId: asset.id,
        startDate: isoDate(0),
        endDate: isoDate(30),
        screenIds: [malecon.id]
      },
      advertiser
    );
  }

  process.stdout.write(
    [
      "",
      "Demo ready.",
      "",
      `  Owner        ${ownerEmail} / ${PASSWORD}   (Vallas del Caribe)`,
      `  Advertiser   ${advertiserEmail} / ${PASSWORD}   (Café Aroma)`,
      "",
      `  Dashboard    http://localhost:5175`,
      `  Player       http://localhost:5174/?hw=${PLAYER_HW_ID}`,
      `  Pairing code ${formatPairingCode(registered.code)}  (already linked to Malecón Santo Domingo)`,
      "",
      "  One ad request from Café Aroma is waiting at /requests for approval.",
      ""
    ].join("\n")
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`\nSeed failed: ${(error as Error).message}\n`);
  process.exitCode = 1;
});
