/**
 * Browser-side capture for speaking tasks: the microphone, a MediaRecorder for
 * playback, and SpeechRecognition (Chrome/Edge) for the transcript.
 * Client-only; every function guards against running without `window`.
 */

type RecognitionResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function captureSupport(): { recognition: boolean; recorder: boolean; microphone: boolean } {
  if (typeof window === "undefined") return { recognition: false, recorder: false, microphone: false };
  return {
    recognition: recognitionCtor() !== null,
    recorder: typeof MediaRecorder !== "undefined",
    microphone: !!navigator.mediaDevices?.getUserMedia,
  };
}

export type MicProblem = "denied" | "missing" | "busy" | "unsupported" | "other";

export class MicError extends Error {
  constructor(readonly problem: MicProblem) {
    super(problem);
  }
}

export const MIC_MESSAGES: Record<MicProblem, string> = {
  denied:
    "Microphone access was blocked. Click the camera/microphone icon in the address bar, allow the microphone for this site, then try again.",
  missing: "No microphone was found. Plug one in (or check your system sound settings) and try again.",
  busy: "The microphone is in use by another app. Close it (Zoom, Teams…) and try again.",
  unsupported: "This browser can't record audio. Use Chrome or Edge.",
  other: "The microphone couldn't be started. Check your system sound settings and try again.",
};

/** Ask for the microphone, translating DOMException names into problems we can explain. */
export async function openMicrophone(): Promise<MediaStream> {
  if (!captureSupport().microphone) throw new MicError("unsupported");
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") throw new MicError("denied");
    if (name === "NotFoundError" || name === "OverconstrainedError") throw new MicError("missing");
    if (name === "NotReadableError" || name === "AbortError") throw new MicError("busy");
    throw new MicError("other");
  }
}

export function closeMicrophone(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/** First container both this browser and our server accept (Opus in WebM on Chrome, MP4 on Safari). */
function recorderMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export type CaptureResult = {
  /** Null if recording isn't available; the transcript still counts. */
  audio: Blob | null;
  seconds: number;
  transcript: string;
  /** Set when speech recognition failed in a way the user should know about. */
  recognitionError: string | null;
};

const RECOGNITION_ERRORS: Record<string, string> = {
  network: "Speech recognition needs an internet connection (Chrome sends audio to Google to transcribe it).",
  "not-allowed": "Speech recognition was blocked. Allow the microphone for this site.",
  "service-not-allowed": "Speech recognition is turned off in this browser. Use Chrome or Edge.",
  "language-not-supported": "This browser can't transcribe this language.",
  "audio-capture": "Speech recognition couldn't hear the microphone.",
};

/**
 * One answer: records audio and transcribes it at the same time. Chrome ends
 * recognition after a pause, so it is restarted until `stop()` is called.
 */
export class Capture {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private recognition: Recognition | null = null;
  private finalText = "";
  private interimText = "";
  private active = false;
  private startedAt = 0;
  private error: string | null = null;
  /** Set after a non-routine recognition error so onend doesn't restart in a tight loop. */
  private recognitionStopped = false;

  constructor(
    private readonly stream: MediaStream,
    private readonly lang: string,
    /** `final` is settled text; `interim` may still be rewritten by the recognizer. */
    private readonly onTranscript: (text: string, final: string, interim: string) => void,
  ) {}

  start(): void {
    this.active = true;
    this.startedAt = performance.now();

    if (typeof MediaRecorder !== "undefined") {
      try {
        this.recorder = new MediaRecorder(this.stream, { mimeType: recorderMimeType() });
        this.recorder.ondataavailable = (e) => {
          if (e.data.size) this.chunks.push(e.data);
        };
        this.recorder.start(1000);
      } catch {
        this.recorder = null;
      }
    }
    this.startRecognition();
  }

  private startRecognition(): void {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      this.error = RECOGNITION_ERRORS["service-not-allowed"];
      return;
    }
    const rec = new Ctor();
    rec.lang = this.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) this.finalText += `${result[0].transcript.trim()} `;
        else interim += result[0].transcript;
      }
      this.interimText = interim;
      this.onTranscript(this.text(), this.finalText.trim(), this.interimText.trim());
    };
    rec.onerror = (e) => {
      // "no-speech" and "aborted" are routine; the restart in onend handles them.
      // Every other error would just fail again on restart, so stop transcribing
      // (the audio recording carries on) and tell the user.
      if (RECOGNITION_ERRORS[e.error]) {
        this.error = RECOGNITION_ERRORS[e.error];
        this.recognitionStopped = true;
      }
    };
    rec.onend = () => {
      // Keep any words that were still interim when the session ended.
      if (this.interimText.trim()) {
        this.finalText += `${this.interimText.trim()} `;
        this.interimText = "";
      }
      if (this.active && !this.recognitionStopped && this.recognition === rec) {
        try {
          rec.start();
        } catch {
          /* already restarting */
        }
      }
    };
    this.recognition = rec;
    try {
      rec.start();
    } catch {
      this.error = "Speech recognition couldn't start.";
    }
  }

  private text(): string {
    return `${this.finalText}${this.interimText}`.replace(/\s+/g, " ").trim();
  }

  /** Stop both and resolve once the last audio chunk and transcript are in. */
  async stop(): Promise<CaptureResult> {
    this.active = false;
    const seconds = (performance.now() - this.startedAt) / 1000;

    const audio = await new Promise<Blob | null>((resolve) => {
      const recorder = this.recorder;
      if (!recorder || recorder.state === "inactive") return resolve(null);
      recorder.onstop = () =>
        resolve(this.chunks.length ? new Blob(this.chunks, { type: recorder.mimeType }) : null);
      recorder.stop();
    });

    const rec = this.recognition;
    if (rec) {
      // Give recognition a moment to deliver the final result for the last words.
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        const timer = setTimeout(done, 1200);
        rec.onend = () => {
          clearTimeout(timer);
          if (this.interimText.trim()) this.finalText += `${this.interimText.trim()} `;
          this.interimText = "";
          done();
        };
        try {
          rec.stop();
        } catch {
          clearTimeout(timer);
          done();
        }
      });
      this.recognition = null;
    }

    return { audio, seconds, transcript: this.text(), recognitionError: this.error };
  }

  /** Abandon without results (unmount, restart). */
  cancel(): void {
    this.active = false;
    try {
      this.recognition?.abort();
    } catch {
      /* ignore */
    }
    this.recognition = null;
    if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
  }
}

/** Locale used for recognition and for reading prompts aloud. */
export function speechLang(exam: "celpip" | "tcf"): string {
  return exam === "celpip" ? "en-CA" : "fr-CA";
}
