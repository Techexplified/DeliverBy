-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "detectionMethod" TEXT NOT NULL DEFAULT 'ip',
ADD COLUMN     "locationFallback" TEXT NOT NULL DEFAULT 'ask';
