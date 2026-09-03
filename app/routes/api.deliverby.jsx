import db from "../db.server";
import { resolveZoneByCountry, detectCountryFromPostalCode } from "../utils/geo.js";
import { calculate } from "../utils/calculator.js";
import { formatDeliveryLine, formatDateValue } from "../utils/formatter.js";
import { format } from "date-fns";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export async function loader({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);

  // 1. Extract query parameters
  const shopName = url.searchParams.get("shop");
  const country = url.searchParams.get("country");
  const postalCode = url.searchParams.get("postalCode") || null;
  const productTitle = url.searchParams.get("productTitle") || "";
  const productType = url.searchParams.get("productType") || "";
  const vendor = url.searchParams.get("vendor") || "";
  const rawTags = url.searchParams.get("tags") || "";
  const tags = rawTags ? rawTags.split(",").map((t) => t.trim()) : [];
  const rawStock = url.searchParams.get("stock");
  const stock = rawStock !== null && rawStock !== "" ? parseInt(rawStock,10) : 10;

  if (!shopName) {
    return new Response(
      JSON.stringify({ show: false, error: "Missing required 'shop' parameter" }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    // 2. Fetch Shop settings and relations
    const settings = await db.shop.findUnique({
      where: { shop: shopName },
      include: {
        closures: { orderBy: { date: "asc" } },
        zones: { orderBy: { isFallback: "asc" } },
        rules: { orderBy: { priorityOrder: "asc" } },
      },
    });

    if (!settings) {
      return new Response(
        JSON.stringify({ show: false, error: "Shop not configured" }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const { closures, rules, zones } = settings;

    // 3. Resolve Shopper Delivery Zone
    let shopperZone = null;
    let isExplicitPincodeProvided = Boolean(postalCode && postalCode.trim());

    if (isExplicitPincodeProvided) {
      const detectedCountry = detectCountryFromPostalCode(postalCode);
      shopperZone = resolveZoneByCountry(detectedCountry || "FALLBACK", zones);
    } else if (country && country.trim()) {
      shopperZone = resolveZoneByCountry(country.trim(), zones);
    } else {
      // Location is completely unknown (e.g. privacy mode, VPN)
      if (settings.locationFallback === "home") {
        shopperZone = zones.find((z) => z.isHome) || zones[0];
      } else if (settings.locationFallback === "fallback") {
        shopperZone = zones.find((z) => z.isFallback) || zones[0];
      } else {
        // "ask" mode -> show postal code prompt in the widget
        return new Response(
          JSON.stringify({
            show: true,
            isFallbackMode: true,
            fallbackText: settings.fallbackText || "Enter your postcode for a delivery date",
            design: {
              container: settings.widgetContainer || "none",
              alignment: settings.widgetAlignment || "left",
              icon: settings.widgetIcon || "van",
              accentColor: settings.widgetAccentColor || "#1A5D38",
              showIcon: settings.showDeliveryIcon !== false,
              position: settings.widgetPosition || "below-atc",
            },
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      }
    }

    // 4. Calculate Delivery Estimate
    const now = new Date();
    const calculation = calculate({
      cutoffTime: settings.cutoffTime || "14:00",
      workingDays: settings.workingDays || [1, 2, 3, 4, 5, 6],
      closures: closures || [],
      carrierSat: Boolean(settings.carrierSat),
      carrierSun: Boolean(settings.carrierSun),
      procMin: settings.procMin ?? 1,
      procMax: settings.procMax ?? 2,
      rules: rules || [],
      shopSettings: settings,
      product: {
        title: productTitle,
        type: productType,
        productType: productType,
        vendor: vendor,
        tags: tags,
        stock: stock,
      },
      shopperZone: shopperZone,
      currentDate: now,
    });

    // If matching rule specifies behaviour "hide", hide the widget
    if (calculation.mode === "hide") {
      return new Response(
        JSON.stringify({ show: false, mode: "hide" }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // 5. Format Output Strings & Tokens
    let formattedDate = "";
    if (calculation.mode === "merchant") {
      formattedDate = calculation.merchantDate || "your specified date";
    } else if (calculation.mode === "ok") {
      formattedDate = formatDateValue({
        arriveMin: calculation.arriveMin,
        arriveMax: calculation.arriveMax,
        dateFormat: settings.dateFormat || "range",
        dateStyle: settings.dateStyle || "full",
        currentDate: now,
      });
    }

    const mainLineText = formatDeliveryLine({
      template: settings.mainLine || "Get it {date}",
      arriveMin: calculation.arriveMin,
      arriveMax: calculation.arriveMax,
      dateFormat: settings.dateFormat || "range",
      dateStyle: settings.dateStyle || "full",
      zoneName: shopperZone?.name || "Domestic",
      currentDate: now,
    });

    const supportingLineText = formatDeliveryLine({
      template: settings.supportingLine || "Dispatched from Kolkata",
      arriveMin: calculation.arriveMin,
      arriveMax: calculation.arriveMax,
      dateFormat: settings.dateFormat || "range",
      dateStyle: settings.dateStyle || "full",
      zoneName: shopperZone?.name || "Domestic",
      currentDate: now,
    });

    // Breakdown formatted strings
    const shipShort = calculation.mode === "ok"
      ? calculation.shipMin.getMonth() === calculation.shipMax.getMonth()
        ? `${format(calculation.shipMin, "d")}–${format(calculation.shipMax, "d MMM")}`
        : `${format(calculation.shipMin, "d MMM")} – ${format(calculation.shipMax, "d MMM")}`
      : "1–2 days";

    const transitText = `${shopperZone?.transitMin ?? 2}–${shopperZone?.transitMax ?? 4} days to ${shopperZone?.name || "Domestic"}`;

    // 6. Return Complete Payload with CORS
    return new Response(
      JSON.stringify({
        show: true,
        mode: calculation.mode,
        mainLine: mainLineText,
        formattedDate: formattedDate,
        supportingLine: supportingLineText,
        cutoff: {
          show: settings.showCutoffCountdown !== false,
          cutoffTime: settings.cutoffTime || "14:00",
          closedToday: Boolean(calculation.closedToday),
          pastCutoff: Boolean(calculation.pastCutoff),
        },
        breakdown: {
          show: settings.showBreakdown !== false,
          leavesUs: shipShort,
          inTransit: transitText,
        },
        design: {
          container: settings.widgetContainer || "none",
          alignment: settings.widgetAlignment || "left",
          icon: settings.widgetIcon || "van",
          accentColor: settings.widgetAccentColor || "#1A5D38",
          showIcon: settings.showDeliveryIcon !== false,
          position: settings.widgetPosition || "below-atc",
        },
        fallback: {
          text: settings.fallbackText || "Enter your postcode for a delivery date",
          isFallbackMode: false,
        },
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("DeliverBy Storefront API Error:", error);
    return new Response(
      JSON.stringify({ show: false, error: error.message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}