import { prisma } from "@/lib/prisma";

/**
 * Everything the app has stored, as one JSON download: attempts with their
 * responses and feedback, settings, phrase reviews, mock exams and AI sets.
 * Recordings stay on disk (data/recordings); responses name their files.
 */
export async function GET() {
  try {
    const [attempts, studySettings, phraseReviews, savedPhrases, mockExams, generatedSets] = await Promise.all([
      prisma.attempt.findMany({ orderBy: { createdAt: "asc" }, include: { responses: true } }),
      prisma.studySettings.findMany(),
      prisma.phraseReview.findMany(),
      prisma.savedPhrase.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.mockExam.findMany({ orderBy: { startedAt: "asc" } }),
      prisma.generatedSet.findMany({ orderBy: { createdAt: "asc" } }),
    ]);
    const exportedAt = new Date().toISOString();
    const body = JSON.stringify(
      { app: "pr-language-prep", version: 1, exportedAt, attempts, studySettings, phraseReviews, savedPhrases, mockExams, generatedSets },
      null,
      2,
    );
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="language-prep-${exportedAt.slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[export] failed", error);
    return Response.json({ error: { message: "Couldn't read the database for the export." } }, { status: 500 });
  }
}
