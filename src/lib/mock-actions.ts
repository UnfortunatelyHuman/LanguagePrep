"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isTrack } from "@/lib/exams";
import { createMockExam } from "@/lib/mock";

/** Start a new mock exam on this track and open it. */
export async function startMockExam(track: string): Promise<void> {
  if (!isTrack(track)) throw new Error("Unknown track");
  const id = await createMockExam(track);
  revalidatePath(`/${track}`, "layout");
  redirect(`/${track}/mock/${id}`);
}
