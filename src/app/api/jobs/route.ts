import { NextRequest } from "next/server";
import { renderApiHeaders, renderApiUrl } from "@/lib/render-api";
import { forwardJson } from "@/lib/proxy";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search;
  const upstream = await fetch(renderApiUrl(`/jobs${search}`), {
    headers: renderApiHeaders(),
    cache: "no-store",
  });
  return forwardJson(upstream);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type");

  const upstream = await fetch(renderApiUrl("/jobs"), {
    method: "POST",
    headers: renderApiHeaders(contentType ? { "content-type": contentType } : undefined),
    body: request.body,
    duplex: "half",
  } as RequestInit);

  return forwardJson(upstream);
}
