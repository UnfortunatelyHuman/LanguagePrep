"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAiError } from "@/lib/ai";
import { isTrack } from "@/lib/exams";
import { findGenerateOption } from "./kinds";
import { SetFormatError, generateSet } from "./sets";

export type GenerateState = { error: string | null };

const Input = z.object({
  track: z.string(),
  kind: z.string(),
  topic: z.string().trim().max(120).optional().default(""),
});

/** Form action: generate a set, then open it. Errors come back as a message for the form. */
export async function generateSetAction(_prev: GenerateState, form: FormData): Promise<GenerateState> {
  const parsed = Input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Please choose what to generate (topics are limited to 120 characters)." };
  const { track, kind, topic } = parsed.data;
  if (!isTrack(track)) return { error: "Unknown exam track." };
  const option = findGenerateOption(track, kind);
  if (!option) return { error: "That kind of set isn't available for this exam." };

  let created: { id: string; skill: string };
  try {
    created = await generateSet(track, option, topic);
  } catch (error) {
    if (isAiError(error)) {
      console.error(`[generate] AI ${error.kind}: ${error.message}`);
      return { error: error.message };
    }
    console.error("[generate] failed", error);
    return {
      error:
        error instanceof SetFormatError
          ? "The AI's set didn't pass the format checks. Please try again."
          : "Something went wrong on the server while saving the set. Please try again.",
    };
  }

  revalidatePath(`/${track}`, "layout");
  // redirect() throws, so it stays outside the try/catch above.
  redirect(`/${track}/${created.skill}/${created.id}`);
}
