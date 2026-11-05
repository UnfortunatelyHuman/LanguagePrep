/**
 * The study plan reasons in calendar days ("today", "3 days ago"). Its pure
 * functions read a Date's local fields, which on a server are the server's
 * zone. `wallClock` shifts an instant so its local fields show the time in
 * the learner's zone instead; with no zone set, the server's is used.
 */

export function isTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Every IANA zone the runtime knows, for the settings picker. */
export function timeZoneNames(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

/** A Date whose local fields equal the wall-clock time of `date` in `timeZone`. */
export function wallClock(date: Date, timeZone: string | null): Date {
  if (!timeZone || !isTimeZone(timeZone)) return date;
  const parts: Record<string, number> = {};
  for (const p of new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}
