// app/models/onboarding.server.js
import prisma from "../db.server";
import { DEFAULT_ZONES } from "../libs/settings/defaults";

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
          create: DEFAULT_ZONES.map((z) => ({
            name: z.name,
            countries: z.countries,
            transitMin: z.transitMin,
            transitMax: z.transitMax,
            isHome: z.isHome,
            isFallback: z.isFallback,
          })),
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
