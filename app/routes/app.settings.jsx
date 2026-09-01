import { data, useLoaderData, useFetcher } from "react-router";
import { useState, useEffect } from "react";
import db from "../db.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { COUNTRIES } from "./app.zones";
import "../styles/settings.css";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shopName = session.shop;

  const shopData = await db.shop.findUnique({
    where: { shop: shopName },
    include: {
      closures: {
        orderBy: { date: "asc" },
      },
      rules: {
        orderBy: { priorityOrder: "asc" },
      },
      zones: {
        orderBy: { isFallback: "asc" },
      },
    },
  });

  return data({ shopData });
}

function validateConfiguration(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return "Configuration must be a valid JSON object";
  }

  if (parsed.cutoffTime && !/^\d{1,2}:\d{2}$/.test(parsed.cutoffTime)) {
    return "Invalid cutoffTime format. Expected 'HH:mm' (e.g. 14:00)";
  }

  if (
    parsed.workingDays &&
    (!Array.isArray(parsed.workingDays) ||
      parsed.workingDays.some((d) => typeof d !== "number" || d < 0 || d > 7))
  ) {
    return "Invalid workingDays. Expected array of day numbers (e.g. [1, 2, 3, 4, 5])";
  }

  if (parsed.zones) {
    if (!Array.isArray(parsed.zones)) {
      return "Invalid zones format. Expected an array of delivery zones.";
    }
    for (const z of parsed.zones) {
      if (!z.name || typeof z.name !== "string") {
        return "Each delivery zone must have a valid name";
      }
    }
  }

  if (parsed.rules) {
    if (!Array.isArray(parsed.rules)) {
      return "Invalid rules format. Expected an array of product rules.";
    }
    for (const r of parsed.rules) {
      if (!r.matchField || !r.matchValue || !r.behaviour) {
        return "Each product rule must contain matchField, matchValue, and behaviour";
      }
    }
  }

  if (parsed.closures) {
    if (!Array.isArray(parsed.closures)) {
      return "Invalid closures format. Expected an array of closures.";
    }
    for (const c of parsed.closures) {
      if (!c.date || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) {
        return "Each closure must have a valid date in YYYY-MM-DD format";
      }
    }
  }

  return null;
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shopName = session.shop;
  const payload = await request.json();
  const { intent } = payload;

  if (intent === "saveLocation") {
    const { detectionMethod, locationFallback } = payload;
    await db.shop.update({
      where: { shop: shopName },
      data: {
        detectionMethod: detectionMethod || "ip",
        locationFallback: locationFallback || "ask",
      },
    });
    return data({ success: true, message: "Settings saved" });
  }

  if (intent === "resetDefaults") {
    const shop = await db.shop.findUnique({ where: { shop: shopName } });
    if (!shop) return data({ error: "Shop not found" });

    // Clean relations and reset shop to initial factory defaults
    await db.$transaction([
      db.closure.deleteMany({ where: { shopId: shop.id } }),
      db.productRule.deleteMany({ where: { shopId: shop.id } }),
      db.deliveryZone.deleteMany({ where: { shopId: shop.id } }),
      db.shop.update({
        where: { id: shop.id },
        data: {
          cutoffTime: "14:00",
          procMin: 1,
          procMax: 2,
          oosEnabled: true,
          oosDays: 10,
          workingDays: [1, 2, 3, 4, 5, 6],
          carrierSat: false,
          carrierSun: false,
          homeCountry: "IN",
          customsClearanceEnabled: false,
          customsClearanceDays: 2,
          peakSeasonoEnabled: false,
          peakSeasonStart: null,
          peakSeasonEnd: null,
          peakSeasonTransitMin: 1,
          peakSeasonTransitMax: 3,
          dateFormat: "range",
          dateStyle: "full",
          mainLine: "Get it {date}",
          supportingLine: "Dispatched from Kolkata",
          fallbackText: "Enter your postcode for a delivery date",
          showCutoffCountdown: true,
          showBreakdown: true,
          showDeliveryIcon: true,
          widgetContainer: "none",
          widgetAlignment: "left",
          widgetIcon: "van",
          widgetAccentColor: "#1A5D38",
          detectionMethod: "ip",
          locationFallback: "ask",
        },
      }),
      db.deliveryZone.createMany({
        data: [
          {
            shopId: shop.id,
            name: "India domestic",
            countries: ["IN"],
            transitMin: 2,
            transitMax: 4,
            isHome: true,
            isFallback: false,
          },
          {
            shopId: shop.id,
            name: "Rest of world",
            countries: [],
            transitMin: 7,
            transitMax: 14,
            isHome: false,
            isFallback: true,
          },
        ],
      }),
    ]);

    return data({ success: true, message: "Settings reset to defaults" });
  }

  if (intent === "importConfig") {
    const { config } = payload;
    const shop = await db.shop.findUnique({ where: { shop: shopName } });
    if (!shop) return data({ error: "Shop not found" });

    try {
      const parsed = typeof config === "string" ? JSON.parse(config) : config;

      // Validate parsed content
      const validationError = validateConfiguration(parsed);
      if (validationError) {
        return data({ error: validationError });
      }

      await db.$transaction(async (tx) => {
        // 1. Update Shop scalar fields
        await tx.shop.update({
          where: { id: shop.id },
          data: {
            cutoffTime: parsed.cutoffTime || "14:00",
            procMin: parsed.procMin ?? 1,
            procMax: parsed.procMax ?? 2,
            oosEnabled: parsed.oosEnabled ?? true,
            oosDays: parsed.oosDays ?? 10,
            workingDays: parsed.workingDays || [1, 2, 3, 4, 5, 6],
            carrierSat: Boolean(parsed.carrierSat),
            carrierSun: Boolean(parsed.carrierSun),
            homeCountry: parsed.homeCountry || "IN",
            customsClearanceEnabled: Boolean(parsed.customsClearanceEnabled),
            customsClearanceDays: parsed.customsClearanceDays ?? 2,
            peakSeasonoEnabled: Boolean(parsed.peakSeasonoEnabled),
            peakSeasonStart: parsed.peakSeasonStart || null,
            peakSeasonEnd: parsed.peakSeasonEnd || null,
            peakSeasonTransitMin: parsed.peakSeasonTransitMin ?? 1,
            peakSeasonTransitMax: parsed.peakSeasonTransitMax ?? 3,
            dateFormat: parsed.dateFormat || "range",
            dateStyle: parsed.dateStyle || "full",
            mainLine: parsed.mainLine || "Get it {date}",
            supportingLine: parsed.supportingLine || "Dispatched from Kolkata",
            fallbackText: parsed.fallbackText || "Enter your postcode for a delivery date",
            showCutoffCountdown: parsed.showCutoffCountdown !== false,
            showBreakdown: parsed.showBreakdown !== false,
            showDeliveryIcon: parsed.showDeliveryIcon !== false,
            widgetContainer: parsed.widgetContainer || "none",
            widgetAlignment: parsed.widgetAlignment || "left",
            widgetIcon: parsed.widgetIcon || "van",
            widgetAccentColor: parsed.widgetAccentColor || "#1A5D38",
            detectionMethod: parsed.detectionMethod || "ip",
            locationFallback: parsed.locationFallback || "ask",
          },
        });

        // 2. Import Closures if present
        if (Array.isArray(parsed.closures)) {
          await tx.closure.deleteMany({ where: { shopId: shop.id } });
          if (parsed.closures.length > 0) {
            await tx.closure.createMany({
              data: parsed.closures.map((c) => ({
                shopId: shop.id,
                date: c.date,
                reason: c.reason || "",
              })),
            });
          }
        }

        // 3. Import Zones if present
        if (Array.isArray(parsed.zones)) {
          await tx.deliveryZone.deleteMany({ where: { shopId: shop.id } });
          if (parsed.zones.length > 0) {
            await tx.deliveryZone.createMany({
              data: parsed.zones.map((z) => ({
                shopId: shop.id,
                name: z.name,
                countries: z.countries || [],
                transitMin: z.transitMin ?? 2,
                transitMax: z.transitMax ?? 4,
                isHome: Boolean(z.isHome),
                isFallback: Boolean(z.isFallback),
              })),
            });
          }
        }

        // 4. Import Rules if present
        if (Array.isArray(parsed.rules)) {
          await tx.productRule.deleteMany({ where: { shopId: shop.id } });
          if (parsed.rules.length > 0) {
            await tx.productRule.createMany({
              data: parsed.rules.map((r, idx) => ({
                shopId: shop.id,
                priorityOrder: r.priorityOrder ?? idx,
                matchField: r.matchField,
                matchOperator: r.matchOperator,
                matchValue: r.matchValue,
                behaviour: r.behaviour,
                procMin: r.procMin ?? 0,
                procMax: r.procMax ?? 0,
                isEnabled: r.isEnabled !== false,
              })),
            });
          }
        }
      });

      return data({ success: true, message: "Configuration imported successfully" });
    } catch (e) {
      return data({ error: `Invalid JSON: ${e.message}` });
    }
  }

  return data({ error: "Invalid action" });
}

export default function Settings() {
  const { shopData } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [detectionMethod, setDetectionMethod] = useState(shopData?.detectionMethod || "ip");
  const [locationFallback, setLocationFallback] = useState(shopData?.locationFallback || "ask");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");

  const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message || "Saved");
      setIsImportModalOpen(false);
      setIsResetModalOpen(false);
      setImportJsonText("");
    } else if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const homeZone = (shopData?.zones || []).find((z) => z.isHome);
  const homeCountryObj = COUNTRIES.find((c) => c.code === shopData?.homeCountry);
  const homeZoneName = homeZone?.name || (homeCountryObj ? `${homeCountryObj.name} domestic` : "Home zone");

  const handleSaveLocation = () => {
    fetcher.submit(
      {
        intent: "saveLocation",
        detectionMethod,
        locationFallback,
      },
      { method: "POST", encType: "application/json" }
    );
  };

  const handleCopyConfig = () => {
    if (!shopData) return;
    const exportData = {
      cutoffTime: shopData.cutoffTime,
      procMin: shopData.procMin,
      procMax: shopData.procMax,
      oosEnabled: shopData.oosEnabled,
      oosDays: shopData.oosDays,
      workingDays: shopData.workingDays,
      carrierSat: shopData.carrierSat,
      carrierSun: shopData.carrierSun,
      homeCountry: shopData.homeCountry,
      customsClearanceEnabled: shopData.customsClearanceEnabled,
      customsClearanceDays: shopData.customsClearanceDays,
      peakSeasonoEnabled: shopData.peakSeasonoEnabled,
      peakSeasonStart: shopData.peakSeasonStart,
      peakSeasonEnd: shopData.peakSeasonEnd,
      peakSeasonTransitMin: shopData.peakSeasonTransitMin,
      peakSeasonTransitMax: shopData.peakSeasonTransitMax,
      dateFormat: shopData.dateFormat,
      dateStyle: shopData.dateStyle,
      mainLine: shopData.mainLine,
      supportingLine: shopData.supportingLine,
      fallbackText: shopData.fallbackText,
      showCutoffCountdown: shopData.showCutoffCountdown,
      showBreakdown: shopData.showBreakdown,
      showDeliveryIcon: shopData.showDeliveryIcon,
      widgetContainer: shopData.widgetContainer,
      widgetAlignment: shopData.widgetAlignment,
      widgetIcon: shopData.widgetIcon,
      widgetAccentColor: shopData.widgetAccentColor,
      detectionMethod: shopData.detectionMethod,
      locationFallback: shopData.locationFallback,
      closures: shopData.closures,
      zones: shopData.zones,
      rules: shopData.rules,
    };

    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    shopify.toast.show("Configuration copied to clipboard");
  };

  const handleImportSubmit = () => {
    if (!importJsonText.trim()) {
      shopify.toast.show("Please paste a JSON configuration first", { isError: true });
      return;
    }

    try {
      const parsed = JSON.parse(importJsonText.trim());
      if (typeof parsed !== "object" || Array.isArray(parsed) || !parsed) {
        shopify.toast.show("Invalid format: Must be a JSON object", { isError: true });
        return;
      }
    } catch (e) {
      shopify.toast.show(`Invalid JSON syntax: ${e.message}`, { isError: true });
      return;
    }

    fetcher.submit(
      {
        intent: "importConfig",
        config: importJsonText.trim(),
      },
      { method: "POST", encType: "application/json" }
    );
  };

  const handleResetSubmit = () => {
    fetcher.submit(
      {
        intent: "resetDefaults",
      },
      { method: "POST", encType: "application/json" }
    );
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <div>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Location detection and configuration management.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSaveLocation}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Section 1: Shopper Location */}
      <div className="settings-section">
        <h2 className="settings-section-title">Shopper location</h2>
        <p className="settings-section-desc">
          How DeliverBy decides which zone a visitor belongs to before they reach checkout.
        </p>

        <div className="settings-card">
          <div className="settings-field">
            <label className="settings-label">Detection method</label>
            <select
              className="settings-select"
              value={detectionMethod}
              onChange={(e) => setDetectionMethod(e.target.value)}
            >
              <option value="ip">Geolocation by IP address</option>
            </select>
            <p className="settings-field-hint">
              Fast and invisible, but wrong for anyone on a VPN. Pair it with a sensible fallback.
            </p>
          </div>

          <div className="settings-field">
            <label className="settings-label">Fall back to</label>
            <select
              className="settings-select"
              value={locationFallback}
              onChange={(e) => setLocationFallback(e.target.value)}
            >
              <option value="ask">Don't guess — ask for pin code on product page</option>
              <option value="home">{homeZoneName}</option>
              <option value="fallback">Rest of world zone</option>
            </select>
            <p className="settings-field-hint">
              Used when detection fails and you'd rather show something than nothing. Set it to{" "}
              <strong>Don't guess</strong> if you sell into very different markets.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Configuration */}
      <div className="settings-section">
        <h2 className="settings-section-title">Configuration</h2>
        <p className="settings-section-desc">
          Move these settings to another store, or backup and restore them anytime.
        </p>

        <div className="settings-card">
          <div className="btn-group">
            <button type="button" className="btn" onClick={handleCopyConfig}>
              Copy configuration
            </button>
            <button type="button" className="btn" onClick={() => setIsImportModalOpen(true)}>
              Paste configuration
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setIsResetModalOpen(true)}
            >
              Reset everything to defaults
            </button>
          </div>

          <p className="settings-field-hint" style={{ margin: 0 }}>
            Paste the copied configuration into another store or the storefront simulator to see
            your exact settings running on a real product page.
          </p>
        </div>
      </div>

      {/* Paste / Import Modal */}
      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Paste configuration</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsImportModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: "0 0 10px", color: "#616161", fontSize: "12.5px" }}>
                Paste the exported JSON configuration below. This will overwrite your current
                settings, zones, and rules.
              </p>
              <textarea
                className="json-textarea"
                placeholder='{"cutoffTime": "14:00", "procMin": 1, ...}'
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn"
                onClick={() => setIsImportModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImportSubmit}
                disabled={!importJsonText.trim() || isSaving}
              >
                {isSaving ? "Importing..." : "Import configuration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: "#C5280C" }}>
                Reset everything to defaults?
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsResetModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: "#303030", fontSize: "13px", lineHeight: "18px" }}>
                Are you sure you want to reset all your DeliverBy settings, delivery zones, product
                rules, and closures? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn"
                onClick={() => setIsResetModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleResetSubmit}
                disabled={isSaving}
              >
                {isSaving ? "Resetting..." : "Yes, reset everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
