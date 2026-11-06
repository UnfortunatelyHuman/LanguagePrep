-- CreateTable
CREATE TABLE "ReviewCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "example" TEXT,
    "ease" REAL NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "due" TEXT NOT NULL,
    "introducedDay" TEXT,
    "lastReviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StudyDay" (
    "day" TEXT NOT NULL PRIMARY KEY,
    "lessons" INTEGER NOT NULL DEFAULT 0,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "messages" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "CourseSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'fr',
    "newCardsPerDay" INTEGER NOT NULL DEFAULT 10,
    "ttsReplies" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ReviewCard_due_idx" ON "ReviewCard"("due");

-- CreateIndex
CREATE INDEX "ReviewCard_introducedDay_idx" ON "ReviewCard"("introducedDay");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCard_source_sourceId_front_key" ON "ReviewCard"("source", "sourceId", "front");
