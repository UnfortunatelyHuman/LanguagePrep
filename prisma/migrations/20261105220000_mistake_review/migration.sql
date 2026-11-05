-- CreateTable
CREATE TABLE "MistakeReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MistakeReview_exam_setId_questionId_key" ON "MistakeReview"("exam", "setId", "questionId");
