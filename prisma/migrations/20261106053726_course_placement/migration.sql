-- CreateTable
CREATE TABLE "PlacementQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "model" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlacementResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "levels" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "startUnitId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PlacementQuestion_level_skill_idx" ON "PlacementQuestion"("level", "skill");

-- CreateIndex
CREATE INDEX "PlacementResult_createdAt_idx" ON "PlacementResult"("createdAt");
