"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { examKey } from "@/lib/attempts";
import { isTrack } from "@/lib/exams";
import { prisma } from "@/lib/prisma";
import { deleteRecording } from "@/lib/speaking/recordings";

export type DeleteState = { error: string | null; deleted: boolean };

/**
 * Delete one attempt, its responses (cascade) and any kept recordings. Mock
 * exams derive completion from attempts, so a deleted step simply reopens.
 */
export async function deleteAttemptAction(_prev: DeleteState, form: FormData): Promise<DeleteState> {
  const track = String(form.get("track") ?? "");
  const attemptId = String(form.get("attemptId") ?? "");
  const afterDelete = String(form.get("afterDelete") ?? "");
  if (!isTrack(track) || !/^[a-z0-9]{1,40}$/.test(attemptId)) {
    return { error: "That attempt can't be deleted.", deleted: false };
  }

  try {
    const attempt = await prisma.attempt.findFirst({
      where: { id: attemptId, exam: examKey(track) },
      select: { responses: { where: { audioPath: { not: null } }, select: { id: true } } },
    });
    if (!attempt) return { error: "That attempt was already deleted.", deleted: true };

    await prisma.attempt.delete({ where: { id: attemptId } });
    // Files go after the rows: a leftover file is harmless, a row without its file isn't.
    await Promise.all(attempt.responses.map((r) => deleteRecording(r.id)));
  } catch (error) {
    console.error("[data] delete attempt failed", error);
    return { error: "Couldn't delete the attempt. Please try again.", deleted: false };
  }

  revalidatePath(`/${track}`, "layout");
  // From the attempt's own page: leave it on the server, or the refreshed page
  // would render "not found" before the client could navigate away.
  // redirect() throws, so it stays outside the try/catch above.
  if (new RegExp(`^/${track}/(writing|speaking)$`).test(afterDelete)) redirect(afterDelete);
  return { error: null, deleted: true };
}
