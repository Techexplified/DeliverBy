-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'range',
ADD COLUMN     "dateStyle" TEXT NOT NULL DEFAULT 'full',
ADD COLUMN     "fallbackText" TEXT NOT NULL DEFAULT 'Enter your postcode for a delivery date',
ADD COLUMN     "hideWhenNoRule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mainLine" TEXT NOT NULL DEFAULT 'Get it {date}',
ADD COLUMN     "showBreakdown" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showCutoffCountdown" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showDeliveryIcon" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supportingLine" TEXT NOT NULL DEFAULT 'Dispatched from Kolkata',
ADD COLUMN     "widgetAccentColor" TEXT NOT NULL DEFAULT '#1A5D38',
ADD COLUMN     "widgetAlignment" TEXT NOT NULL DEFAULT 'left',
ADD COLUMN     "widgetContainer" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "widgetIcon" TEXT NOT NULL DEFAULT 'van';
