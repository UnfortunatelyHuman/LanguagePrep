-- CreateTable
CREATE TABLE "CourseUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grammar" TEXT NOT NULL,
    "vocabulary" TEXT NOT NULL,
    "focusSkill" TEXT NOT NULL,
    "focusText" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "CourseUnit_level_createdAt_idx" ON "CourseUnit"("level", "createdAt");
