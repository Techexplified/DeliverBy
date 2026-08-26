-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "cutoffTime" TEXT NOT NULL DEFAULT '14:00',
    "procMin" INTEGER NOT NULL DEFAULT 1,
    "procMax" INTEGER NOT NULL DEFAULT 2,
    "oosEnabled" BOOLEAN NOT NULL DEFAULT true,
    "oosDays" INTEGER NOT NULL DEFAULT 10,
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "carrierSat" BOOLEAN NOT NULL DEFAULT false,
    "carrierSun" BOOLEAN NOT NULL DEFAULT false,
    "homeCountry" TEXT NOT NULL DEFAULT 'IN',
    "widgetPosition" TEXT NOT NULL DEFAULT 'below-atc',

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Closure" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Closure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countries" TEXT[],
    "transitMin" INTEGER NOT NULL DEFAULT 2,
    "transitMax" INTEGER NOT NULL DEFAULT 4,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRule" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "priorityOrder" INTEGER NOT NULL DEFAULT 0,
    "matchField" TEXT NOT NULL,
    "matchOperator" TEXT NOT NULL,
    "matchValue" TEXT NOT NULL,
    "behaviour" TEXT NOT NULL,
    "procMin" INTEGER NOT NULL DEFAULT 0,
    "procMax" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shop_key" ON "Shop"("shop");

-- CreateIndex
CREATE INDEX "Closure_shopId_idx" ON "Closure"("shopId");

-- CreateIndex
CREATE INDEX "DeliveryZone_shopId_idx" ON "DeliveryZone"("shopId");

-- CreateIndex
CREATE INDEX "ProductRule_shopId_idx" ON "ProductRule"("shopId");

-- AddForeignKey
ALTER TABLE "Closure" ADD CONSTRAINT "Closure_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRule" ADD CONSTRAINT "ProductRule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
