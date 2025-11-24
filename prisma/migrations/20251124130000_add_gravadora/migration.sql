-- Migration: add Label

CREATE TABLE "Label" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "Label_name_key" ON "Label" ("name");

-- Add column to Album
ALTER TABLE "Album" ADD COLUMN "labelId" INTEGER;

-- Add FK constraint with SET NULL on delete
ALTER TABLE "Album"
  ADD CONSTRAINT "Album_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE SET NULL;
