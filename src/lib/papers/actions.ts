"use server";

import { revalidatePath } from "next/cache";
import { isTrack } from "@/lib/exams";
import { deleteUserPaper, saveUserPaper } from "./store";

/** Largest paper JSON accepted, in characters (a full TCF paper is about 50 000). */
const MAX_JSON = 400_000;

export type SavePaperResult = { error: string } | { setId: string; skill: string };

/**
 * Save a paper from the form editor or the JSON importer. `json` is the
 * paper as text; `setId` replaces an existing paper instead of adding one.
 */
export async function savePaperAction(input: {
  track: string;
  json: string;
  setId?: string;
}): Promise<SavePaperResult> {
  if (!isTrack(input.track)) return { error: "Unknown exam track." };
  if (typeof input.json !== "string" || !input.json.trim()) return { error: "The paper is empty." };
  if (input.json.length > MAX_JSON) return { error: "That paper is too large (over 400 000 characters)." };

  let raw: unknown;
  try {
    raw = JSON.parse(input.json);
  } catch (error) {
    return { error: `That isn't valid JSON: ${error instanceof Error ? error.message : "parse error"}` };
  }

  try {
    const result = await saveUserPaper(input.track, raw, input.setId || undefined);
    if ("error" in result) return result;
    revalidatePath(`/${input.track}`, "layout");
    return result;
  } catch (error) {
    console.error("[papers] save failed", error);
    return { error: "Couldn't save the paper. Please try again." };
  }
}

export type DeletePaperState = { error: string | null; deleted: boolean };

export async function deletePaperAction(_prev: DeletePaperState, form: FormData): Promise<DeletePaperState> {
  const track = String(form.get("track") ?? "");
  const setId = String(form.get("setId") ?? "");
  if (!isTrack(track)) return { error: "Unknown exam track.", deleted: false };
  try {
    const deleted = await deleteUserPaper(track, setId);
    if (!deleted) return { error: "That paper was already deleted.", deleted: true };
  } catch (error) {
    console.error("[papers] delete failed", error);
    return { error: "Couldn't delete the paper. Please try again.", deleted: false };
  }
  revalidatePath(`/${track}`, "layout");
  return { error: null, deleted: true };
}
