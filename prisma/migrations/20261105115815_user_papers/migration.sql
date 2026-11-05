-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GeneratedSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "exam" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_GeneratedSet" ("createdAt", "data", "exam", "id", "skill", "title") SELECT "createdAt", "data", "exam", "id", "skill", "title" FROM "GeneratedSet";
DROP TABLE "GeneratedSet";
ALTER TABLE "new_GeneratedSet" RENAME TO "GeneratedSet";
CREATE INDEX "GeneratedSet_exam_skill_createdAt_idx" ON "GeneratedSet"("exam", "skill", "createdAt");
CREATE INDEX "GeneratedSet_exam_source_createdAt_idx" ON "GeneratedSet"("exam", "source", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
