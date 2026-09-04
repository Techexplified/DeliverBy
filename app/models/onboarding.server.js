// app/models/onboarding.server.js
import prisma from "../db.server";

export async function getOnboardingData(shopDomain) {
  let shopRecord = await prisma.shop.findUnique({
    where: { shop: shopDomain },
    include: {
      closures: true,
      zones: true,
      rules: { orderBy: { priorityOrder: "asc" } },
    },
  });

  // If this is a brand-new store, create with default initial zones
  if (!shopRecord) {
    shopRecord = await prisma.shop.create({
      data: {
        shop: shopDomain,
        zones: {
          create: [
            { name: "India domestic", countries: ["IN"], transitMin: 2, transitMax: 4, isHome: true, isFallback: false },
            { name: "United States", countries: ["US"], transitMin: 6, transitMax: 9, isHome: false, isFallback: false },
            { name: "Europe", countries: ["GB", "DE", "FR", "NL", "IE", "ES", "IT"], transitMin: 5, transitMax: 8, isHome: false, isFallback: false },
            { name: "Australia & New Zealand", countries: ["AU", "NZ"], transitMin: 8, transitMax: 12, isHome: false, isFallback: false },
            { name: "Rest of world", countries: [], transitMin: 12, transitMax: 24, isHome: false, isFallback: true },
          ],
        },
      },
      include: {
        closures: true,
        zones: true,
        rules: true,
      },
    });
  }

  return shopRecord;
}

export async function completeOnboarding(shopDomain) {
  return await prisma.shop.update({
    where: { shop: shopDomain },
    data: { isOnboarded: true },
  });
}

export async function saveOnboardingData(shopDomain, payload) {
  const { shopSettings, closures = [], zones = [], rules = [], isOnboarded } = payload;

  return await prisma.$transaction(async (tx) => {
    // 1. Update Shop fields
    const updatedShop = await tx.shop.update({
      where: { shop: shopDomain },
      data: {
        ...shopSettings,
        ...(typeof isOnboarded === "boolean" ? { isOnboarded } : {}),
      },
    });

    // 2. Refresh closures (delete existing, insert new)
    await tx.closure.deleteMany({ where: { shopId: updatedShop.id } });
    if (closures.length > 0) {
      await tx.closure.createMany({
        data: closures.map((c) => ({
          shopId: updatedShop.id,
          date: c.date,
          reason: c.reason || "Closed",
        })),
      });
    }

    // 3. Refresh zones
    await tx.deliveryZone.deleteMany({ where: { shopId: updatedShop.id } });
    if (zones.length > 0) {
      await tx.deliveryZone.createMany({
        data: zones.map((z) => ({
          shopId: updatedShop.id,
          name: z.name,
          countries: z.countries || [],
          transitMin: z.transitMin,
          transitMax: z.transitMax,
          isHome: Boolean(z.isHome),
          isFallback: Boolean(z.isFallback),
        })),
      });
    }

    // 4. Refresh rules
    await tx.productRule.deleteMany({ where: { shopId: updatedShop.id } });
    if (rules.length > 0) {
      await tx.productRule.createMany({
        data: rules.map((r, index) => ({
          shopId: updatedShop.id,
          priorityOrder: index,
          matchField: r.matchField,
          matchOperator: r.matchOperator,
          matchValue: r.matchValue,
          behaviour: r.behaviour,
          procMin: r.procMin || 0,
          procMax: r.procMax || 0,
          isEnabled: r.isEnabled !== false,
        })),
      });
    }

    return updatedShop;
  });
}
