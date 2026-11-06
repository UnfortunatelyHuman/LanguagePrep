import { prisma } from "@/lib/prisma";

/**
 * Everything the app has stored, as one JSON download: attempts with their
 * responses and feedback, settings, phrase reviews, mistakes, mock exams, AI
 * sets and the French course (lessons, attempts, cards, placement, chats, notes).
 * Recordings stay on disk (data/recordings); responses name their files.
 */
export async function GET() {
  try {
    const [
      attempts,
      studySettings,
      phraseReviews,
      savedPhrases,
      mockExams,
      generatedSets,
      mistakeReviews,
      courseLessons,
      lessonAttempts,
      placementQuestions,
      placementResults,
      reviewCards,
      studyDays,
      courseSettings,
      conversations,
      noteImports,
      checkpointResults,
    ] = await Promise.all([
      prisma.attempt.findMany({ orderBy: { createdAt: "asc" }, include: { responses: true } }),
      prisma.studySettings.findMany(),
      prisma.phraseReview.findMany(),
      prisma.savedPhrase.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.mockExam.findMany({ orderBy: { startedAt: "asc" } }),
      prisma.generatedSet.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.mistakeReview.findMany(),
      prisma.courseLesson.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.lessonAttempt.findMany({ orderBy: { startedAt: "asc" } }),
      prisma.placementQuestion.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.placementResult.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.reviewCard.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.studyDay.findMany({ orderBy: { day: "asc" } }),
      prisma.courseSettings.findMany(),
      prisma.conversation.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.noteImport.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.checkpointResult.findMany({ orderBy: { createdAt: "asc" } }),
    ]);
    const exportedAt = new Date().toISOString();
    const body = JSON.stringify(
      {
        app: "pr-language-prep",
        version: 2,
        exportedAt,
        attempts,
        studySettings,
        phraseReviews,
        savedPhrases,
        mockExams,
        generatedSets,
        mistakeReviews,
        frenchCourse: {
          lessons: courseLessons,
          lessonAttempts,
          placementQuestions,
          placementResults,
          reviewCards,
          studyDays,
          settings: courseSettings,
          conversations,
          noteImports,
          checkpointResults,
        },
      },
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
