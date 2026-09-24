import { renderApiHeaders, renderApiUrl } from "@/lib/render-api";
import { forwardJson } from "@/lib/forward";
import { guardJob } from "@/lib/api-guard";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const denied = await guardJob(id);
  if (denied) return denied;
  const upstream = await fetch(renderApiUrl(`/jobs/${id}/cancel`), {
    method: "POST",
    headers: renderApiHeaders(),
  });
  return forwardJson(upstream);
}
