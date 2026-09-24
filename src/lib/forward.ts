import { NextResponse } from "next/server";

export async function forwardJson(upstream: Response): Promise<NextResponse> {
  const text = await upstream.text();
  const contentType = upstream.headers.get("content-type") ?? "application/json";

  if (!text) {
    return new NextResponse(null, { status: upstream.status });
  }

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": contentType },
  });
}
