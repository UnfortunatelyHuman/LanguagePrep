import "server-only";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Speaking recordings live on disk next to the SQLite database, outside git
 * (`data/` is ignored). Response.audioPath stores only the file name.
 */
const DIR = path.join(process.cwd(), "data", "recordings");

/** Largest recording accepted: ~4.5 minutes of Opus is well under 5 MB. */
export const MAX_RECORDING_BYTES = 15 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

const CONTENT_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(EXTENSIONS).map(([type, ext]) => [ext, type]),
);

/** Safe file names only: cuid + known extension, so a stored path can't escape the folder. */
const FILE_NAME = /^[a-z0-9]+\.(webm|ogg|m4a|mp3|wav)$/;

/** Base MIME type without codecs, e.g. "audio/webm;codecs=opus" → "audio/webm". */
function baseType(type: string): string {
  return type.split(";")[0].trim().toLowerCase();
}

export function isAcceptedRecording(file: File): boolean {
  return file.size > 0 && file.size <= MAX_RECORDING_BYTES && baseType(file.type) in EXTENSIONS;
}

/** Write a recording for a response and return the stored file name. */
export async function saveRecording(responseId: string, file: File): Promise<string> {
  const name = `${responseId}.${EXTENSIONS[baseType(file.type)]}`;
  if (!FILE_NAME.test(name)) throw new Error(`Unsafe recording name: ${name}`);
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

/** Remove any file saved for a response (cleanup after a failed save). */
export async function deleteRecording(responseId: string): Promise<void> {
  if (!/^[a-z0-9]+$/.test(responseId)) return;
  const names = await readdir(DIR).catch(() => [] as string[]);
  await Promise.all(
    names
      .filter((n) => n.startsWith(`${responseId}.`) && FILE_NAME.test(n))
      .map((n) => unlink(path.join(DIR, n)).catch(() => undefined)),
  );
}

/** Read a stored recording, or null if the name is unsafe or the file is gone. */
export async function readRecording(
  name: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  if (!FILE_NAME.test(name)) return null;
  try {
    const data = await readFile(path.join(DIR, name));
    return { data, contentType: CONTENT_TYPES[name.split(".").pop()!] };
  } catch {
    return null;
  }
}
