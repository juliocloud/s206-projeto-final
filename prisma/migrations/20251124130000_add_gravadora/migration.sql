-- Migration: add Gravadora

CREATE TABLE "Gravadora" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "Gravadora_name_key" ON "Gravadora" ("name");

-- Add column to Album
ALTER TABLE "Album" ADD COLUMN "gravadoraId" INTEGER;

-- Add FK constraint with SET NULL on delete
ALTER TABLE "Album"
  ADD CONSTRAINT "Album_gravadoraId_fkey" FOREIGN KEY ("gravadoraId") REFERENCES "Gravadora"("id") ON DELETE SET NULL;
