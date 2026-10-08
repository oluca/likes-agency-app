import { RenderStudio } from "@/components/render-studio";
import { maxUploadBytes } from "@/lib/render-api";

export default async function StudioPage({ searchParams }: PageProps<"/">) {
  const { retry } = await searchParams;
  const retryId = typeof retry === "string" ? retry : undefined;
  return <RenderStudio maxUploadBytes={maxUploadBytes()} retryId={retryId} />;
}
