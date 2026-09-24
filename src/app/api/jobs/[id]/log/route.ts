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
  const upstream = await fetch(renderApiUrl(`/jobs/${id}/log`), {
    headers: renderApiHeaders(),
    cache: "no-store",
  });
  return forwardJson(upstream);
}
