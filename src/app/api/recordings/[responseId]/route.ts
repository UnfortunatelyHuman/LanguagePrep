import { readRecording } from "@/lib/speaking/recordings";
import { recordingFileName } from "@/lib/speaking/store";

/** Parse a single "bytes=start-end" range; null when absent or unsatisfiable. */
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  const match = header ? /^bytes=(\d*)-(\d*)$/.exec(header.trim()) : null;
  if (!match || (!match[1] && !match[2])) return null;
  let start: number;
  let end: number;
  if (!match[1]) {
    // "bytes=-500": the last 500 bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  return start <= end && start < size ? { start, end } : null;
}

/**
 * Stream a kept speaking recording. Supports Range requests: Safari won't
 * play <audio> without them, and they make seeking work everywhere.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/recordings/[responseId]">) {
  const { responseId } = await ctx.params;
  const name = await recordingFileName(responseId);
  const file = name ? await readRecording(name) : null;
  if (!file) return new Response("Recording not found", { status: 404 });

  const size = file.data.length;
  const headers = {
    "Content-Type": file.contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const range = parseRange(rangeHeader, size);
    if (!range) {
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    }
    const chunk = file.data.subarray(range.start, range.end + 1);
    return new Response(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
        "Content-Length": String(chunk.length),
      },
    });
  }

  return new Response(new Uint8Array(file.data), {
    headers: { ...headers, "Content-Length": String(size) },
  });
}
