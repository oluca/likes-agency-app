export interface VideoProbe {
  duration_s?: number;
  width?: number;
  height?: number;
  thumbnail?: Blob;
}

const THUMB_WIDTH = 480;

/** Reads duration, resolution and a mid-clip frame in the browser. Resolves with whatever it could read (never rejects). */
export function probeVideo(file: File): Promise<VideoProbe> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const result: VideoProbe = {};
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      resolve(result);
    };
    const timer = setTimeout(finish, 8000);

    video.onerror = finish;
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration)) result.duration_s = Math.round(video.duration * 1000) / 1000;
      if (video.videoWidth && video.videoHeight) {
        result.width = video.videoWidth;
        result.height = video.videoHeight;
      }
      video.currentTime = Math.min(1, (video.duration || 0) / 2);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, THUMB_WIDTH / (video.videoWidth || THUMB_WIDTH));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) result.thumbnail = blob;
            finish();
          },
          "image/jpeg",
          0.75
        );
      } catch {
        finish();
      }
    };
    video.src = url;
  });
}
