"use client";

import { useId, useRef, useState } from "react";
import { Play, SpinnerGap, UploadSimple, VideoCamera, WarningCircle } from "@phosphor-icons/react/ssr";
import { createJob, ApiError } from "@/lib/api-client";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { btn, cn, helpClass, inputClass, labelClass } from "@/lib/ui";
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

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className={helpClass}>{hint}</p>}
    </div>
  );
}

function formatSize(bytes: number) {
  return bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`;
}

export function RenderForm({ onJobCreated }: RenderFormProps) {
  const formId = useId();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
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
      toast({ tone: "success", title: "Render gestartet", description: "Der Job wurde in die Warteschlange gestellt." });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Render konnte nicht gestartet werden.";
      setError(message);
      toast({ tone: "error", title: "Start fehlgeschlagen", description: message });
    } finally {
      setSubmitting(false);
    }
  }

  const id = (name: string) => `${formId}-${name}`;

  const videoTab = (
    <div className="flex flex-col gap-5">
      <div>
        <span className={labelClass}>Video-Datei</span>
        <label
          htmlFor={id("file")}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped && fileInput.current) {
              fileInput.current.files = e.dataTransfer.files;
              setFile(dropped);
              setError(null);
            }
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
            dragging ? "border-accent bg-accent-soft" : "border-line-strong hover:border-fg/40 hover:bg-sunken"
          )}
        >
          <input
            ref={fileInput}
            id={id("file")}
            type="file"
            accept="video/*"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
            className="sr-only"
          />
          {file ? (
            <>
              <VideoCamera size={26} className="text-accent-text" />
              <span className="max-w-full truncate text-sm font-medium text-fg">{file.name}</span>
              <span className="tabular text-[13px] text-muted">{formatSize(file.size)} · zum Ändern klicken</span>
            </>
          ) : (
            <>
              <UploadSimple size={26} className="text-muted" />
              <span className="text-sm font-medium text-fg">Video hierher ziehen oder auswählen</span>
              <span className="text-[13px] text-muted">MP4, MOV und andere Videoformate</span>
            </>
          )}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start (s)" htmlFor={id("start")}>
          <input id={id("start")} type="number" step="0.1" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} placeholder="optional" />
        </Field>
        <Field label="Ende (s)" htmlFor={id("end")}>
          <input id={id("end")} type="number" step="0.1" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} placeholder="optional" />
        </Field>
      </div>

      <Field label="Style-Preset" htmlFor={id("style")}>
        <select id={id("style")} value={style} onChange={(e) => setStyle(e.target.value)} className={inputClass}>
          {STYLE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );

  const cutTab = (
    <div className="flex flex-col gap-3">
      <Switch checked={cutSilence} onChange={setCutSilence} label="Stille schneiden" description="Entfernt Pausen im Video." />
      {cutSilence && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-sunken p-4">
          <Field label="Min. Stille-Dauer (s)" htmlFor={id("silence-min-dur")}>
            <input id={id("silence-min-dur")} type="number" step="0.05" value={silenceMinDur} onChange={(e) => setSilenceMinDur(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Stille behalten (s)" htmlFor={id("silence-keep")}>
            <input id={id("silence-keep")} type="number" step="0.05" value={silenceKeep} onChange={(e) => setSilenceKeep(e.target.value)} className={inputClass} />
          </Field>
        </div>
      )}
      <Switch checked={zoom} onChange={setZoom} label="Zoom" description="Setzt automatische Zooms für mehr Dynamik." />
      <Switch checked={sfx} onChange={setSfx} label="SFX" description="Fügt passende Sound-Effekte ein." />
    </div>
  );

  const transcribeTab = (
    <div className="flex flex-col gap-4">
      <Switch checked={autoEmphasis} onChange={setAutoEmphasis} label="Auto-Betonung" description="Hebt wichtige Wörter in den Untertiteln automatisch hervor." />
      {!autoEmphasis && (
        <div className="flex flex-col gap-4 rounded-lg border border-line bg-sunken p-4">
          <Field label="Betonung (kommagetrennt)" htmlFor={id("emphasis")}>
            <input id={id("emphasis")} type="text" value={emphasis} onChange={(e) => setEmphasis(e.target.value)} className={inputClass} placeholder="wort1, wort2" />
          </Field>
          <Field label="Starke Betonung (kommagetrennt)" htmlFor={id("emphasis-strong")}>
            <input id={id("emphasis-strong")} type="text" value={emphasisStrong} onChange={(e) => setEmphasisStrong(e.target.value)} className={inputClass} placeholder="wort1, wort2" />
          </Field>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Whisper-Modell" htmlFor={id("whisper-model")}>
          <select id={id("whisper-model")} value={whisperModel} onChange={(e) => setWhisperModel(e.target.value)} className={inputClass}>
            {WHISPER_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Engine" htmlFor={id("engine")}>
          <select id={id("engine")} value={engine} onChange={(e) => setEngine(e.target.value)} className={inputClass}>
            {ENGINES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sprache" htmlFor={id("language")}>
          <input id={id("language")} type="text" value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass} />
        </Field>
        <Field label="GPU" htmlFor={id("gpu")}>
          <select id={id("gpu")} value={gpu} onChange={(e) => setGpu(e.target.value)} className={inputClass}>
            {GPU_MODES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Tabs
        tabs={[
          { id: "video", label: "Video", content: videoTab },
          { id: "cut", label: "Schnitt", content: cutTab },
          { id: "transcribe", label: "Transkription", content: transcribeTab },
        ]}
      />

      {error && (
        <p role="alert" className="flex items-start gap-2.5 rounded-lg border border-accent/50 bg-accent-soft px-3.5 py-3 text-sm text-accent-text">
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-line pt-5">
        <p className="min-w-0 truncate text-[13px] text-muted">{file ? file.name : "Noch keine Datei ausgewählt"}</p>
        <button type="submit" disabled={submitting} className={btn("primary")}>
          {submitting ? <SpinnerGap size={16} weight="bold" className="animate-spin motion-reduce:animate-none" /> : <Play size={16} weight="fill" />}
          {submitting ? "Wird gestartet…" : "Render starten"}
        </button>
      </div>
    </form>
  );
}
