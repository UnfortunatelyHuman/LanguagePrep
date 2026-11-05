import { readRecording } from "@/lib/speaking/recordings";
import { recordingFileName } from "@/lib/speaking/store";

/** Stream a kept speaking recording back for playback. */
export async function GET(_request: Request, ctx: RouteContext<"/api/recordings/[responseId]">) {
  const { responseId } = await ctx.params;
  const name = await recordingFileName(responseId);
  const file = name ? await readRecording(name) : null;
  if (!file) return new Response("Recording not found", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.data.length),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
