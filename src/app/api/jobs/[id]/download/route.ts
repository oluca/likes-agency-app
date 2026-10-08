import { NextRequest, NextResponse } from "next/server";
import { callUpstream } from "@/lib/render-api";
import { forwardJson } from "@/lib/forward";
import { guardJob } from "@/lib/api-guard";

const PASS_THROUGH = ["content-type", "content-disposition", "content-length", "content-range", "accept-ranges"];

/** Streams the MP4 with the API key attached. Range requests are forwarded so <video> can seek (required by Safari). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardJob(id);
  if (denied) return denied;

  const range = request.headers.get("range");
  const upstream = await callUpstream(`/jobs/${id}/download`, { headers: range ? { range } : undefined });
  if (!upstream.ok) return forwardJson(upstream);

  const headers = new Headers();
  for (const name of PASS_THROUGH) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
