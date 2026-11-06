import "server-only";
import { generateJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { taskFeedbackFixture } from "./fixtures";
import { taskGradingPrompt } from "./prompts";
import { TaskFeedbackSchema, type Lesson, type TaskFeedback } from "./schemas";
import type { CourseLevel } from "./syllabus";

export type GradedTask = TaskFeedback & { model: string };

/** One AI request: grade the lesson's mini task on the TCF 0–20 scale. Throws AiError. */
export async function gradeTask(
  lesson: Lesson,
  level: CourseLevel,
  answer: string,
  kind: "writing" | "speaking",
): Promise<GradedTask> {
  const { system, prompt } = taskGradingPrompt(lesson, level, answer, kind);
  let model = "";
  const feedback = await generateJSON(prompt, TaskFeedbackSchema, {
    system,
    temperature: 0.2,
    onModel: (m) => (model = m),
    mockFixture: () => taskFeedbackFixture(answer),
  });
  return { ...feedback, model };
}

/** The attempt to attach the task to: the given one if it belongs to this lesson, else a new one. */
export async function attemptFor(lessonId: string, attemptId: string | null): Promise<string> {
  if (attemptId) {
    const found = await prisma.lessonAttempt.findFirst({ where: { id: attemptId, lessonId }, select: { id: true } });
    if (found) return found.id;
  }
  const created = await prisma.lessonAttempt.create({ data: { lessonId }, select: { id: true } });
  return created.id;
}

export async function saveTask(attemptId: string, kind: "writing" | "speaking", text: string, graded: GradedTask) {
  await prisma.lessonAttempt.update({
    where: { id: attemptId },
    data: { taskKind: kind, taskText: text, taskScore: graded.score, taskFeedback: graded },
  });
}

export async function completeAttempt(attemptId: string) {
  await prisma.lessonAttempt.update({ where: { id: attemptId }, data: { completedAt: new Date() } });
}
