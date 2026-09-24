import { RenderStudio } from "@/components/render-studio";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="mb-8 w-full max-w-5xl">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Shortform Video Render
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Internes Tool zum Starten und Verfolgen von Video-Render-Jobs.
        </p>
      </div>
      <RenderStudio />
    </div>
  );
}
