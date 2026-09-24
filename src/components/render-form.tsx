"use client";

import { useId, useState } from "react";
import { createJob, ApiError } from "@/lib/api-client";
import {
  ENGINES,
  GPU_MODES,
  STYLE_PRESETS,
  WHISPER_MODELS,
  type RenderParams,
} from "@/lib/types";

interface RenderFormProps {
  onJobCreated: (jobId: string) => void;
}

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

export function RenderForm({ onJobCreated }: RenderFormProps) {
  const formId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [cutSilence, setCutSilence] = useState(false);
  const [silenceMinDur, setSilenceMinDur] = useState("0.45");
  const [silenceKeep, setSilenceKeep] = useState("0.2");
  const [zoom, setZoom] = useState(true);
  const [sfx, setSfx] = useState(true);
  const [autoEmphasis, setAutoEmphasis] = useState(true);
  const [emphasis, setEmphasis] = useState("");
  const [emphasisStrong, setEmphasisStrong] = useState("");
  const [whisperModel, setWhisperModel] = useState("small");
  const [language, setLanguage] = useState("de");
  const [style, setStyle] = useState("");
  const [gpu, setGpu] = useState("auto");
  const [engine, setEngine] = useState("faster-whisper");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Bitte eine Video-Datei auswählen.");
      return;
    }

    const params: RenderParams = {
      cut_silence: cutSilence,
      zoom,
      sfx,
      auto_emphasis: autoEmphasis,
      whisper_model: whisperModel as RenderParams["whisper_model"],
      language,
      style: style === "" ? null : style,
      gpu: gpu as RenderParams["gpu"],
      engine: engine as RenderParams["engine"],
    };
    if (start !== "") params.start = Number(start);
    if (end !== "") params.end = Number(end);
    if (cutSilence) {
      params.silence_min_dur = Number(silenceMinDur);
      params.silence_keep = Number(silenceKeep);
    }
    if (!autoEmphasis) {
      if (emphasis.trim()) params.emphasis = emphasis.trim();
      if (emphasisStrong.trim()) params.emphasis_strong = emphasisStrong.trim();
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createJob(file, params);
      onJobCreated(result.job_id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Render konnte nicht gestartet werden.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor={`${formId}-file`}>
          Video-Datei
        </label>
        <input
          id={`${formId}-file`}
          type="file"
          accept="video/*"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${formId}-start`}>
            Start (s)
          </label>
          <input
            id={`${formId}-start`}
            type="number"
            step="0.1"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={inputClass}
            placeholder="optional"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${formId}-end`}>
            Ende (s)
          </label>
          <input
            id={`${formId}-end`}
            type="number"
            step="0.1"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={inputClass}
            placeholder="optional"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={cutSilence}
            onChange={(e) => setCutSilence(e.target.checked)}
          />
          Stille schneiden
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={zoom} onChange={(e) => setZoom(e.target.checked)} />
          Zoom
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={sfx} onChange={(e) => setSfx(e.target.checked)} />
          SFX
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={autoEmphasis}
            onChange={(e) => setAutoEmphasis(e.target.checked)}
          />
          Auto-Betonung
        </label>
      </div>

      {cutSilence && (
        <div className="grid grid-cols-2 gap-4 rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor={`${formId}-silence-min-dur`}>
              Min. Stille-Dauer (s)
            </label>
            <input
              id={`${formId}-silence-min-dur`}
              type="number"
              step="0.05"
              value={silenceMinDur}
              onChange={(e) => setSilenceMinDur(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor={`${formId}-silence-keep`}>
              Stille behalten (s)
            </label>
            <input
              id={`${formId}-silence-keep`}
              type="number"
              step="0.05"
              value={silenceKeep}
              onChange={(e) => setSilenceKeep(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {!autoEmphasis && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor={`${formId}-emphasis`}>
              Betonung (kommagetrennt)
            </label>
            <input
              id={`${formId}-emphasis`}
              type="text"
              value={emphasis}
              onChange={(e) => setEmphasis(e.target.value)}
              className={inputClass}
              placeholder="wort1, wort2"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor={`${formId}-emphasis-strong`}>
              Starke Betonung (kommagetrennt)
            </label>
            <input
              id={`${formId}-emphasis-strong`}
              type="text"
              value={emphasisStrong}
              onChange={(e) => setEmphasisStrong(e.target.value)}
              className={inputClass}
              placeholder="wort1, wort2"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${formId}-whisper-model`}>
            Whisper-Modell
          </label>
          <select
            id={`${formId}-whisper-model`}
            value={whisperModel}
            onChange={(e) => setWhisperModel(e.target.value)}
            className={inputClass}
          >
            {WHISPER_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${formId}-engine`}>
            Engine
          </label>
          <select
            id={`${formId}-engine`}
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            className={inputClass}
          >
            {ENGINES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${formId}-language`}>
            Sprache
          </label>
          <input
            id={`${formId}-language`}
            type="text"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${formId}-gpu`}>
            GPU
          </label>
          <select
            id={`${formId}-gpu`}
            value={gpu}
            onChange={(e) => setGpu(e.target.value)}
            className={inputClass}
          >
            {GPU_MODES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor={`${formId}-style`}>
          Style-Preset
        </label>
        <select
          id={`${formId}-style`}
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className={inputClass}
        >
          {STYLE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {submitting ? "Wird gestartet…" : "Render starten"}
      </button>
    </form>
  );
}
