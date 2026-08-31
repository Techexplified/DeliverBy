-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "customsClearanceDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "customsClearanceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "peakSeasonEnd" TEXT,
ADD COLUMN     "peakSeasonStart" TEXT,
ADD COLUMN     "peakSeasonTransitMax" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "peakSeasonTransitMin" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "peakSeasonoEnabled" BOOLEAN NOT NULL DEFAULT false;
