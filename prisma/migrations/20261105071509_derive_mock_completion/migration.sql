/*
  Warnings:

  - You are about to drop the column `completedAt` on the `MockExam` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MockExam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_MockExam" ("exam", "id", "startedAt", "steps") SELECT "exam", "id", "startedAt", "steps" FROM "MockExam";
DROP TABLE "MockExam";
ALTER TABLE "new_MockExam" RENAME TO "MockExam";
CREATE INDEX "MockExam_exam_startedAt_idx" ON "MockExam"("exam", "startedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
