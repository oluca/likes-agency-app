import { renderApiHeaders, renderApiUrl } from "@/lib/render-api";
import { forwardJson } from "@/lib/proxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const upstream = await fetch(renderApiUrl(`/jobs/${id}`), {
    headers: renderApiHeaders(),
    cache: "no-store",
  });
  return forwardJson(upstream);
}
