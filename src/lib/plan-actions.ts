"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { examKey } from "@/lib/attempts";
import { isTrack } from "@/lib/exams";
import { prisma } from "@/lib/prisma";
import { MAX_DAILY_MINUTES, MIN_DAILY_MINUTES, daysUntil } from "@/lib/study-plan";

export type SettingsFormState = {
  ok: boolean;
  message: string | null;
  /** What was submitted, so the form can keep it after a validation error. */
  values?: { examDate: string; dailyMinutes: string };
};

/** Furthest ahead an exam date can be; anything later is almost surely a typo. */
const MAX_DAYS_AHEAD = 730;

const Form = z.object({
  track: z.string(),
  examDate: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Enter the date as YYYY-MM-DD."),
  dailyMinutes: z.coerce
    .number({ message: "Enter the minutes per day as a number." })
    .int("Use whole minutes.")
    .min(MIN_DAILY_MINUTES, `At least ${MIN_DAILY_MINUTES} minutes a day.`)
    .max(MAX_DAILY_MINUTES, `At most ${MAX_DAILY_MINUTES} minutes a day.`),
});

/** Save the exam date and daily time for the study plan (used with useActionState). */
export async function saveStudySettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const values = {
    examDate: String(formData.get("examDate") ?? ""),
    dailyMinutes: String(formData.get("dailyMinutes") ?? ""),
  };
  const fail = (message: string): SettingsFormState => ({ ok: false, message, values });
  const parsed = Form.safeParse({
    track: formData.get("track"),
    examDate: formData.get("examDate") ?? "",
    dailyMinutes: formData.get("dailyMinutes"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const { track, examDate, dailyMinutes } = parsed.data;
  if (!isTrack(track)) return fail("Unknown exam track.");

  let date: Date | null = null;
  if (examDate) {
    date = new Date(`${examDate}T00:00:00Z`);
    // new Date("2026-02-30") rolls over to March 2, so check the round trip too.
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== examDate) {
      return fail("That date doesn't exist.");
    }
    const days = daysUntil(new Date(), date);
    if (days < 0) return fail("The exam date can't be in the past.");
    if (days > MAX_DAYS_AHEAD) return fail("Pick a date within the next two years.");
  }

  const exam = examKey(track);
  await prisma.studySettings.upsert({
    where: { exam },
    create: { exam, examDate: date, dailyMinutes },
    update: { examDate: date, dailyMinutes },
  });
  revalidatePath(`/${track}`, "layout");
  return { ok: true, message: "Saved. Your plan is updated.", values };
}
