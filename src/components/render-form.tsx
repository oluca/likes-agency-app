"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise, Play, SpinnerGap, UploadSimple, VideoCamera, WarningCircle } from "@phosphor-icons/react/ssr";
import { ApiError, createJob, getPresets, uploadThumbnail } from "@/lib/api-client";
import { isRetryable } from "@/lib/api-messages";
import { formatSize } from "@/lib/job-text";
import { rememberJob } from "@/lib/my-jobs";
import { probeVideo } from "@/lib/video-probe";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { btn, cn, helpClass, inputClass, labelClass } from "@/lib/ui";
import { WHISPER_MODELS, type Preset, type PresetSupports, type RenderParams, type WhisperModel } from "@/lib/types";

/** "Kein Preset" (default subtitles at the bottom) supports every option. */
const ALL_SUPPORTED: PresetSupports = { emphasis: true, auto_emphasis: true, zoom: true, sfx: true, sticker: true, cut_silence: true };

const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|mkv|avi|3gp|mpe?g)$/i;
const DESCRIPTION_PREVIEW = 140;

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || (file.type === "" && VIDEO_EXTENSIONS.test(file.name));
}

function shorten(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="mb-1 text-[15px] font-semibold tracking-tight text-fg">{title}</legend>
      {children}
    </fieldset>
  );
}

interface RenderFormProps {
  /** Upload limit in bytes (MAX_UPLOAD_MB). */
  maxUploadBytes: number;
  /** Settings of an earlier job to pre-fill ("Mit gleichen Einstellungen erneut versuchen"). */
  initialParams?: RenderParams;
  parentJobId?: string;
}

export function RenderForm({ maxUploadBytes, initialParams, parentJobId }: RenderFormProps) {
  const formId = useId();
  const id = (name: string) => `${formId}-${name}`;
  const router = useRouter();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const uploadAbort = useRef<AbortController | null>(null);

  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [presetsError, setPresetsError] = useState<string | null>(null);
  const [presetsTick, setPresetsTick] = useState(0);

  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [style, setStyle] = useState(initialParams?.style ?? "");
  const [cutSilence, setCutSilence] = useState(initialParams?.cut_silence ?? false);
  const [zoom, setZoom] = useState(initialParams?.zoom ?? true);
  const [sfx, setSfx] = useState(initialParams?.sfx ?? true);
  const [autoEmphasis, setAutoEmphasis] = useState(initialParams?.auto_emphasis ?? true);
  const [emphasis, setEmphasis] = useState(initialParams?.emphasis ?? "");
  const [emphasisStrong, setEmphasisStrong] = useState(initialParams?.emphasis_strong ?? "");
  const [sticker, setSticker] = useState(initialParams?.sticker ?? "");
  const [stickerDuration, setStickerDuration] = useState(String(initialParams?.sticker_duration ?? ""));
  const [start, setStart] = useState(initialParams?.start != null ? String(initialParams.start) : "");
  const [end, setEnd] = useState(initialParams?.end != null ? String(initialParams.end) : "");
  const [language, setLanguage] = useState(initialParams?.language ?? "de");
  const [whisperModel, setWhisperModel] = useState<WhisperModel>(initialParams?.whisper_model ?? "small");
  const [prompt, setPrompt] = useState(initialParams?.prompt ?? "");
  const [fix, setFix] = useState(initialParams?.fix ?? "");

  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPresets().then(
      (list) => {
        if (cancelled) return;
        setPresets(list);
        setPresetsError(null);
        // A pre-filled preset that no longer exists must not be sent (the API would answer 422).
        setStyle((current) => (list.some((p) => p.name === current) ? current : ""));
      },
      (err) => {
        if (!cancelled) setPresetsError(err instanceof ApiError ? err.message : "Looks konnten nicht geladen werden.");
      }
    );
    return () => {
      cancelled = true;
    };
  }, [presetsTick]);

  const preset = useMemo(() => (style ? (presets?.find((p) => p.name === style) ?? null) : null), [presets, style]);

  const supports = preset ? preset.supports : ALL_SUPPORTED;

  function selectPreset(name: string) {
    const next = name ? presets?.find((p) => p.name === name) : undefined;
    const s = next ? next.supports : ALL_SUPPORTED;
    setStyle(name);
    // Reset what the new look does not support so hidden values are never sent.
    if (!s.emphasis) {
      setEmphasis("");
      setEmphasisStrong("");
    }
    if (!s.auto_emphasis) setAutoEmphasis(true);
    if (!s.zoom) setZoom(true);
    if (!s.sfx) setSfx(true);
    if (!s.sticker) {
      setSticker("");
      setStickerDuration("");
    }
    if (!s.cut_silence) setCutSilence(false);
  }

  function chooseFile(next: File | null) {
    setError(null);
    if (!next) return;
    if (!isVideoFile(next)) {
      setFile(null);
      setFileError("Das ist keine Videodatei. Bitte wähle ein Video (z. B. MP4 oder MOV).");
      return;
    }
    if (next.size > maxUploadBytes) {
      setFile(null);
      setFileError(`Die Datei ist ${formatSize(next.size)} groß. Erlaubt sind höchstens ${formatSize(maxUploadBytes)}.`);
      return;
    }
    setFileError(null);
    setFile(next);
  }

  function validate(): string | null {
    if (!file) return "Bitte wähle zuerst ein Video aus.";
    const s = start === "" ? null : Number(start);
    const e = end === "" ? null : Number(end);
    if (s !== null && (!Number.isFinite(s) || s < 0)) return "Der Start muss 0 oder größer sein.";
    if (e !== null && (!Number.isFinite(e) || e <= 0)) return "Das Ende muss größer als 0 sein.";
    if (s !== null && e !== null && e <= s) return "Das Ende muss nach dem Start liegen.";
    if (supports.sticker && sticker.trim() && stickerDuration !== "") {
      const d = Number(stickerDuration);
      if (!Number.isFinite(d) || d < 0 || d > 60) return "Die Sticker-Dauer muss zwischen 0 und 60 Sekunden liegen.";
    }
    if (!/^[a-z]{2}$/i.test(language.trim())) return "Die Sprache braucht einen Zwei-Buchstaben-Code, z. B. de oder en.";
    return null;
  }

  /** Builds params from the contract's fields only; options the look does not support are left out. */
  function buildParams(): RenderParams {
    const params: RenderParams = { language: language.trim().toLowerCase(), whisper_model: whisperModel };
    if (style) params.style = style;
    if (supports.cut_silence) params.cut_silence = cutSilence;
    if (supports.zoom) params.zoom = zoom;
    if (supports.sfx) params.sfx = sfx;
    if (supports.auto_emphasis) params.auto_emphasis = autoEmphasis;
    if (supports.emphasis && !(supports.auto_emphasis && autoEmphasis)) {
      if (emphasis.trim()) params.emphasis = emphasis.trim();
      if (emphasisStrong.trim()) params.emphasis_strong = emphasisStrong.trim();
    }
    if (supports.sticker && sticker.trim()) {
      params.sticker = sticker.trim();
      if (stickerDuration !== "") params.sticker_duration = Number(stickerDuration);
    }
    if (start !== "") params.start = Number(start);
    if (end !== "") params.end = Number(end);
    if (prompt.trim()) params.prompt = prompt.trim();
    if (fix.trim()) params.fix = fix.trim();
    return params;
  }

  async function submit() {
    if (submitting.current) return; // double-click guard (state updates are async)
    const problem = validate();
    if (problem || !file) {
      setError({ message: problem ?? "Bitte wähle zuerst ein Video aus.", retryable: false });
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError(null);
    setUploadProgress(0);
    uploadAbort.current = new AbortController();
    try {
      const { thumbnail, ...source } = await probeVideo(file);
      const result = await createJob(file, buildParams(), {
        source,
        parentJobId,
        onProgress: setUploadProgress,
        signal: uploadAbort.current.signal,
      });
      rememberJob(result.job_id);
      if (thumbnail) uploadThumbnail(result.job_id, thumbnail).catch(() => {});
      router.push(`/jobs/${encodeURIComponent(result.job_id)}`);
      // Stay "busy" until the navigation replaces this page, so a second click cannot start a duplicate job.
    } catch (err) {
      submitting.current = false;
      setBusy(false);
      setUploadProgress(null);
      if (err instanceof DOMException && err.name === "AbortError") {
        toast({ tone: "info", title: "Upload abgebrochen" });
        return;
      }
      const apiError = err instanceof ApiError ? err : null;
      setError({
        message: apiError?.message ?? "Der Render konnte nicht gestartet werden.",
        retryable: apiError ? isRetryable(apiError.status) : true,
      });
    }
  }

  const uploading = busy && uploadProgress !== null;
  const uploadDone = uploading && uploadProgress >= 1;
  const showAuto = supports.auto_emphasis;
  const showEmphasisInputs = supports.emphasis && !(showAuto && autoEmphasis);
  const hasOptions =
    supports.cut_silence || supports.zoom || supports.sfx || supports.auto_emphasis || supports.emphasis || supports.sticker;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-7"
      noValidate
    >
      <Section title="1. Video">
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
            chooseFile(e.dataTransfer.files?.[0] ?? null);
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
            disabled={busy}
            onChange={(e) => {
              chooseFile(e.target.files?.[0] ?? null);
              e.target.value = ""; // selecting the same file again must fire onChange
            }}
            aria-describedby={fileError ? id("file-error") : id("file-help")}
            className="sr-only"
          />
          {file ? (
            <>
              <VideoCamera size={26} className="text-accent-text" />
              <span className="max-w-full truncate text-sm font-medium text-fg">{file.name}</span>
              <span className="tabular text-[13px] text-muted">{formatSize(file.size)} · zum Ändern tippen</span>
            </>
          ) : (
            <>
              <UploadSimple size={26} className="text-muted" />
              <span className="text-sm font-medium text-fg">Video auswählen oder hierher ziehen</span>
              <span id={id("file-help")} className="text-[13px] text-muted">
                Hochformat (9:16) funktioniert am besten · bis {formatSize(maxUploadBytes)}, max. 30 Minuten
              </span>
            </>
          )}
        </label>
        {fileError && (
          <p id={id("file-error")} role="alert" className="flex items-start gap-2 text-sm text-accent-text">
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
            {fileError}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start (Sekunden)" htmlFor={id("start")}>
            <input id={id("start")} type="number" inputMode="decimal" min="0" step="0.1" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} placeholder="optional" disabled={busy} />
          </Field>
          <Field label="Ende (Sekunden)" htmlFor={id("end")}>
            <input id={id("end")} type="number" inputMode="decimal" min="0" step="0.1" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} placeholder="optional" disabled={busy} />
          </Field>
        </div>
      </Section>

      <Section title="2. Look">
        {presetsError && !presets ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/50 bg-accent-soft px-3.5 py-3 text-sm text-accent-text">
            <WarningCircle size={18} weight="fill" className="shrink-0" />
            <span className="min-w-0 flex-1">Die Looks konnten nicht geladen werden. Du kannst trotzdem ohne Preset rendern. {presetsError}</span>
            <button type="button" onClick={() => setPresetsTick((t) => t + 1)} className={btn("secondary", "sm")}>
              <ArrowClockwise size={14} weight="bold" />
              Erneut versuchen
            </button>
          </div>
        ) : null}
        <Field label="Look" htmlFor={id("style")}>
          <select id={id("style")} value={style} onChange={(e) => selectPreset(e.target.value)} className={inputClass} disabled={busy}>
            <option value="">{presets || presetsError ? "Kein Preset (Standard-Untertitel unten)" : "Looks werden geladen…"}</option>
            {presets?.map((p) => (
              <option key={p.name} value={p.name}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        {preset && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-sunken px-3.5 py-3" aria-live="polite">
            {preset.notes && <p className="text-sm text-fg">{preset.notes}</p>}
            {preset.description && (
              <p className="text-xs text-muted" title={preset.description}>
                {shorten(preset.description, DESCRIPTION_PREVIEW)}
              </p>
            )}
          </div>
        )}
      </Section>

      {hasOptions && (
        <Section title="3. Optionen">
          {supports.cut_silence && <Switch checked={cutSilence} onChange={setCutSilence} label="Stille schneiden" description="Entfernt Pausen im Video." />}
          {supports.zoom && <Switch checked={zoom} onChange={setZoom} label="Punch-Zoom" description="Setzt Zooms für mehr Dynamik." />}
          {supports.sfx && <Switch checked={sfx} onChange={setSfx} label="Soundeffekte" description="Fügt passende Sound-Effekte ein." />}
          {showAuto && <Switch checked={autoEmphasis} onChange={setAutoEmphasis} label="Wörter automatisch wählen" description="Hebt wichtige Wörter in den Untertiteln selbst hervor." />}
          {showEmphasisInputs && (
            <div className="flex flex-col gap-4 rounded-lg border border-line bg-sunken p-4">
              <Field label="Betonte Wörter" htmlFor={id("emphasis")} hint="Kommagetrennt, z. B. Geld, Erfolg">
                <input id={id("emphasis")} type="text" maxLength={2000} value={emphasis} onChange={(e) => setEmphasis(e.target.value)} className={inputClass} disabled={busy} />
              </Field>
              <Field label="Stark betonte Wörter" htmlFor={id("emphasis-strong")} hint="Kommagetrennt">
                <input id={id("emphasis-strong")} type="text" maxLength={2000} value={emphasisStrong} onChange={(e) => setEmphasisStrong(e.target.value)} className={inputClass} disabled={busy} />
              </Field>
            </div>
          )}
          {supports.sticker && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <Field label="Intro-Sticker (Text)" htmlFor={id("sticker")} hint="Optional, bis 200 Zeichen">
                <input id={id("sticker")} type="text" maxLength={200} value={sticker} onChange={(e) => setSticker(e.target.value)} className={inputClass} disabled={busy} />
              </Field>
              <Field label="Dauer (Sekunden)" htmlFor={id("sticker-duration")}>
                <input id={id("sticker-duration")} type="number" inputMode="decimal" min="0" max="60" step="0.5" value={stickerDuration} onChange={(e) => setStickerDuration(e.target.value)} className={inputClass} placeholder="Standard" disabled={busy || !sticker.trim()} />
              </Field>
            </div>
          )}
        </Section>
      )}

      <details className="rounded-lg border border-line">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-fg">Erweitert</summary>
        <div className="flex flex-col gap-4 border-t border-line p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Sprache im Video" htmlFor={id("language")} hint="Zwei Buchstaben, z. B. de, en">
              <input id={id("language")} type="text" maxLength={2} value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass} disabled={busy} />
            </Field>
            <Field label="Genauigkeit" htmlFor={id("whisper")} hint="Größer ist genauer, dauert aber länger.">
              <select id={id("whisper")} value={whisperModel} onChange={(e) => setWhisperModel(e.target.value as WhisperModel)} className={inputClass} disabled={busy}>
                {WHISPER_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Fachwörter" htmlFor={id("prompt")} hint="Hilft der Spracherkennung bei Namen und Fachbegriffen.">
            <textarea id={id("prompt")} maxLength={1000} rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} className={cn(inputClass, "h-auto py-2")} disabled={busy} />
          </Field>
          <Field label="Korrekturen" htmlFor={id("fix")} hint="Format: falsch=richtig, falsch2=richtig2">
            <textarea id={id("fix")} maxLength={2000} rows={2} value={fix} onChange={(e) => setFix(e.target.value)} className={cn(inputClass, "h-auto py-2")} disabled={busy} />
          </Field>
        </div>
      </details>

      {error && (
        <div role="alert" className="flex flex-wrap items-start gap-3 rounded-lg border border-accent/50 bg-accent-soft px-3.5 py-3 text-sm text-accent-text">
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
          <p className="min-w-0 flex-1">{error.message}</p>
          {error.retryable && (
            <button type="button" onClick={submit} disabled={busy} className={btn("secondary", "sm")}>
              <ArrowClockwise size={14} weight="bold" />
              Erneut versuchen
            </button>
          )}
        </div>
      )}

      {uploading && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-fg">{uploadDone ? "Wird übergeben…" : "Video wird hochgeladen…"}</span>
            <span className="tabular text-muted">{Math.round((uploadProgress ?? 0) * 100)} %</span>
          </div>
          <Progress value={(uploadProgress ?? 0) * 100} label="Upload-Fortschritt" valueText={`${Math.round((uploadProgress ?? 0) * 100)} Prozent hochgeladen`} />
          {!uploadDone && (
            <div>
              <button type="button" onClick={() => uploadAbort.current?.abort()} className={btn("ghost", "sm")}>
                Upload abbrechen
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-line pt-5">
        <p className="min-w-0 truncate text-[13px] text-muted">{file ? file.name : "Noch kein Video ausgewählt"}</p>
        <button type="submit" disabled={busy} className={btn("primary")}>
          {busy ? <SpinnerGap size={16} weight="bold" className="animate-spin motion-reduce:animate-none" /> : <Play size={16} weight="fill" />}
          {busy ? "Wird gestartet…" : "Rendern"}
        </button>
      </div>
    </form>
  );
}
