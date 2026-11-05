-- AlterTable
ALTER TABLE "StudySettings" ADD COLUMN "timeZone" TEXT;

-- CreateTable
CREATE TABLE "SavedPhrase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "before" TEXT,
    "source" TEXT NOT NULL,
    "known" BOOLEAN,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SavedPhrase_exam_createdAt_idx" ON "SavedPhrase"("exam", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPhrase_exam_phrase_key" ON "SavedPhrase"("exam", "phrase");
