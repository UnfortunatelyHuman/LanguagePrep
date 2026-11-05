-- CreateTable
CREATE TABLE "StudySettings" (
    "exam" TEXT NOT NULL PRIMARY KEY,
    "examDate" DATETIME,
    "dailyMinutes" INTEGER NOT NULL DEFAULT 45,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PhraseReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam" TEXT NOT NULL,
    "phraseKey" TEXT NOT NULL,
    "known" BOOLEAN NOT NULL,
    "reviews" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MockExam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "GeneratedSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PhraseReview_exam_phraseKey_key" ON "PhraseReview"("exam", "phraseKey");

-- CreateIndex
CREATE INDEX "MockExam_exam_startedAt_idx" ON "MockExam"("exam", "startedAt");

-- CreateIndex
CREATE INDEX "GeneratedSet_exam_skill_createdAt_idx" ON "GeneratedSet"("exam", "skill", "createdAt");
