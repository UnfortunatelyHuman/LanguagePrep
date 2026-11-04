-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "task" TEXT,
    "score" REAL,
    "maxScore" REAL,
    "estimatedLevel" TEXT,
    "durationSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT,
    "text" TEXT,
    "audioPath" TEXT,
    "feedback" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Response_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Attempt_exam_skill_createdAt_idx" ON "Attempt"("exam", "skill", "createdAt");

-- CreateIndex
CREATE INDEX "Response_attemptId_idx" ON "Response"("attemptId");
