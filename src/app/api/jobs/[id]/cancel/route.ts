import { renderApiHeaders, renderApiUrl } from "@/lib/render-api";
import { forwardJson } from "@/lib/proxy";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const upstream = await fetch(renderApiUrl(`/jobs/${id}/cancel`), {
    method: "POST",
    headers: renderApiHeaders(),
  });
  return forwardJson(upstream);
}
