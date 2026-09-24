import { NextResponse } from "next/server";
import { renderApiHeaders, renderApiUrl } from "@/lib/render-api";
import { forwardJson } from "@/lib/forward";
import { guardJob } from "@/lib/api-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const denied = await guardJob(id);
  if (denied) return denied;
  const upstream = await fetch(renderApiUrl(`/jobs/${id}/download`), {
    headers: renderApiHeaders(),
    cache: "no-store",
  });

  if (!upstream.ok) {
    return forwardJson(upstream);
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  const contentDisposition = upstream.headers.get("content-disposition");
  const contentLength = upstream.headers.get("content-length");
  if (contentType) headers.set("content-type", contentType);
  if (contentDisposition) headers.set("content-disposition", contentDisposition);
  if (contentLength) headers.set("content-length", contentLength);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
