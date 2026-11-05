import { z } from "zod";

/**
 * One builder per kind: the zod schema the model fills (only the creative
 * content), the instructions, and a function that wraps that content in a
 * complete set. Ids, labels, timings and word ranges come from the builder,
 * never from the model, so a generated set always matches the real format.
 */
export type Builder<S extends z.ZodType, T> = {
  schema: S;
  instructions: string;
  build: (id: string, data: z.output<S>) => T;
};

export function builder<S extends z.ZodType, T>(b: Builder<S, T>) {
  return b;
}

export const text = (min = 1) => z.string().trim().min(min);
export const title = text().max(80).describe("Short set title, 3–7 words");
export const summary = text().max(220).describe("One English sentence describing the topics");
