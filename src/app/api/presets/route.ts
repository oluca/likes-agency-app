import { NextResponse } from "next/server";
import { renderApiHeaders, renderApiUrl } from "@/lib/render-api";
import { authorizeApi, deny } from "@/lib/api-guard";
import { forwardJson } from "@/lib/forward";

const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; body: unknown } | null = null;

/** Presets rarely change: cached on the server for 5 minutes (stale copy is served if the API is briefly down). */
export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok) return deny(auth.status, auth.detail);

  if (cache && Date.now() - cache.at < TTL_MS) return NextResponse.json(cache.body);

  try {
    const upstream = await fetch(renderApiUrl("/presets"), { headers: renderApiHeaders(), cache: "no-store" });
    if (!upstream.ok) return cache ? NextResponse.json(cache.body) : forwardJson(upstream);
    const body = await upstream.json();
    cache = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch {
    return cache ? NextResponse.json(cache.body) : deny(502, "Render-Dienst nicht erreichbar");
  }
}
