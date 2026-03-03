-- Add imageUpdatedAt to User for avatar cache busting
ALTER TABLE "User" ADD COLUMN "imageUpdatedAt" DATETIME;
