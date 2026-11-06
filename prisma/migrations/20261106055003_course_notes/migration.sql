-- CreateTable
CREATE TABLE "NoteImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "cards" JSONB NOT NULL,
    "exercises" JSONB NOT NULL,
    "cardsAdded" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "NoteImport_createdAt_idx" ON "NoteImport"("createdAt");
