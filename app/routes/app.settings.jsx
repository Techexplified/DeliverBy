import { data, useLoaderData, useFetcher } from "react-router";
import { useState, useEffect } from "react";
import db from "../db.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { COUNTRIES } from "./app.zones";
import {
  DEFAULT_SHOP_SETTINGS,
  DEFAULT_ZONES,
  DEFAULT_RULES,
} from "../libs/settings/defaults";
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
    await db.$transaction(async (tx) => {
      await tx.closure.deleteMany({ where: { shopId: shop.id } });
      await tx.productRule.deleteMany({ where: { shopId: shop.id } });
      await tx.deliveryZone.deleteMany({ where: { shopId: shop.id } });

      await tx.shop.update({
        where: { id: shop.id },
        data: {
          ...DEFAULT_SHOP_SETTINGS,
          isOnboarded: true,
        },
      });

      await tx.deliveryZone.createMany({
        data: DEFAULT_ZONES.map((z) => ({
          shopId: shop.id,
          name: z.name,
          countries: z.countries || [],
          transitMin: z.transitMin,
          transitMax: z.transitMax,
          isHome: Boolean(z.isHome),
          isFallback: Boolean(z.isFallback),
        })),
      });

      await tx.productRule.createMany({
        data: DEFAULT_RULES.map((r) => ({
          shopId: shop.id,
          priorityOrder: r.priorityOrder,
          matchField: r.matchField,
          matchOperator: r.matchOperator,
          matchValue: r.matchValue,
          behaviour: r.behaviour,
          procMin: r.procMin,
          procMax: r.procMax,
          isEnabled: r.isEnabled,
        })),
      });
    });

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
            timezone: parsed.timezone || DEFAULT_SHOP_SETTINGS.timezone,
            cutoffTime: parsed.cutoffTime || DEFAULT_SHOP_SETTINGS.cutoffTime,
            procMin: parsed.procMin ?? DEFAULT_SHOP_SETTINGS.procMin,
            procMax: parsed.procMax ?? DEFAULT_SHOP_SETTINGS.procMax,
            oosEnabled: parsed.oosEnabled ?? DEFAULT_SHOP_SETTINGS.oosEnabled,
            oosDays: parsed.oosDays ?? DEFAULT_SHOP_SETTINGS.oosDays,
            workingDays: parsed.workingDays || DEFAULT_SHOP_SETTINGS.workingDays,
            carrierSat: Boolean(parsed.carrierSat),
            carrierSun: Boolean(parsed.carrierSun),
            homeCountry: parsed.homeCountry || DEFAULT_SHOP_SETTINGS.homeCountry,
            customsClearanceEnabled: Boolean(parsed.customsClearanceEnabled),
            customsClearanceDays: parsed.customsClearanceDays ?? DEFAULT_SHOP_SETTINGS.customsClearanceDays,
            peakSeasonoEnabled: Boolean(parsed.peakSeasonoEnabled),
            peakSeasonStart: parsed.peakSeasonStart || null,
            peakSeasonEnd: parsed.peakSeasonEnd || null,
            peakSeasonTransitMin: parsed.peakSeasonTransitMin ?? DEFAULT_SHOP_SETTINGS.peakSeasonTransitMin,
            peakSeasonTransitMax: parsed.peakSeasonTransitMax ?? DEFAULT_SHOP_SETTINGS.peakSeasonTransitMax,
            dateFormat: parsed.dateFormat || DEFAULT_SHOP_SETTINGS.dateFormat,
            dateStyle: parsed.dateStyle || DEFAULT_SHOP_SETTINGS.dateStyle,
            mainLine: parsed.mainLine || DEFAULT_SHOP_SETTINGS.mainLine,
            supportingLine: parsed.supportingLine || DEFAULT_SHOP_SETTINGS.supportingLine,
            fallbackText: parsed.fallbackText || DEFAULT_SHOP_SETTINGS.fallbackText,
            showCutoffCountdown: parsed.showCutoffCountdown !== false,
            showBreakdown: parsed.showBreakdown !== false,
            showDeliveryIcon: parsed.showDeliveryIcon !== false,
            hideWhenNoRule: Boolean(parsed.hideWhenNoRule),
            widgetContainer: parsed.widgetContainer || DEFAULT_SHOP_SETTINGS.widgetContainer,
            widgetAlignment: parsed.widgetAlignment || DEFAULT_SHOP_SETTINGS.widgetAlignment,
            widgetIcon: parsed.widgetIcon || DEFAULT_SHOP_SETTINGS.widgetIcon,
            widgetAccentColor: parsed.widgetAccentColor || DEFAULT_SHOP_SETTINGS.widgetAccentColor,
            widgetPosition: parsed.widgetPosition || DEFAULT_SHOP_SETTINGS.widgetPosition,
            detectionMethod: parsed.detectionMethod || DEFAULT_SHOP_SETTINGS.detectionMethod,
            locationFallback: parsed.locationFallback || DEFAULT_SHOP_SETTINGS.locationFallback,
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
      timezone: shopData.timezone || DEFAULT_SHOP_SETTINGS.timezone,
      cutoffTime: shopData.cutoffTime || DEFAULT_SHOP_SETTINGS.cutoffTime,
      procMin: shopData.procMin ?? DEFAULT_SHOP_SETTINGS.procMin,
      procMax: shopData.procMax ?? DEFAULT_SHOP_SETTINGS.procMax,
      oosEnabled: shopData.oosEnabled ?? DEFAULT_SHOP_SETTINGS.oosEnabled,
      oosDays: shopData.oosDays ?? DEFAULT_SHOP_SETTINGS.oosDays,
      workingDays: shopData.workingDays || DEFAULT_SHOP_SETTINGS.workingDays,
      carrierSat: Boolean(shopData.carrierSat),
      carrierSun: Boolean(shopData.carrierSun),
      homeCountry: shopData.homeCountry || DEFAULT_SHOP_SETTINGS.homeCountry,
      customsClearanceEnabled: Boolean(shopData.customsClearanceEnabled),
      customsClearanceDays: shopData.customsClearanceDays ?? DEFAULT_SHOP_SETTINGS.customsClearanceDays,
      peakSeasonoEnabled: Boolean(shopData.peakSeasonoEnabled),
      peakSeasonStart: shopData.peakSeasonStart || null,
      peakSeasonEnd: shopData.peakSeasonEnd || null,
      peakSeasonTransitMin: shopData.peakSeasonTransitMin ?? DEFAULT_SHOP_SETTINGS.peakSeasonTransitMin,
      peakSeasonTransitMax: shopData.peakSeasonTransitMax ?? DEFAULT_SHOP_SETTINGS.peakSeasonTransitMax,
      dateFormat: shopData.dateFormat || DEFAULT_SHOP_SETTINGS.dateFormat,
      dateStyle: shopData.dateStyle || DEFAULT_SHOP_SETTINGS.dateStyle,
      mainLine: shopData.mainLine || DEFAULT_SHOP_SETTINGS.mainLine,
      supportingLine: shopData.supportingLine || DEFAULT_SHOP_SETTINGS.supportingLine,
      fallbackText: shopData.fallbackText || DEFAULT_SHOP_SETTINGS.fallbackText,
      showCutoffCountdown: shopData.showCutoffCountdown !== false,
      showBreakdown: shopData.showBreakdown !== false,
      showDeliveryIcon: shopData.showDeliveryIcon !== false,
      hideWhenNoRule: Boolean(shopData.hideWhenNoRule),
      widgetContainer: shopData.widgetContainer || DEFAULT_SHOP_SETTINGS.widgetContainer,
      widgetAlignment: shopData.widgetAlignment || DEFAULT_SHOP_SETTINGS.widgetAlignment,
      widgetIcon: shopData.widgetIcon || DEFAULT_SHOP_SETTINGS.widgetIcon,
      widgetAccentColor: shopData.widgetAccentColor || DEFAULT_SHOP_SETTINGS.widgetAccentColor,
      widgetPosition: shopData.widgetPosition || DEFAULT_SHOP_SETTINGS.widgetPosition,
      detectionMethod: shopData.detectionMethod || DEFAULT_SHOP_SETTINGS.detectionMethod,
      locationFallback: shopData.locationFallback || DEFAULT_SHOP_SETTINGS.locationFallback,
      closures: (shopData.closures || []).map((c) => ({
        date: c.date,
        reason: c.reason || "",
      })),
      zones: (shopData.zones || []).map((z) => ({
        name: z.name,
        countries: z.countries || [],
        transitMin: z.transitMin,
        transitMax: z.transitMax,
        isHome: Boolean(z.isHome),
        isFallback: Boolean(z.isFallback),
      })),
      rules: (shopData.rules || []).map((r, idx) => ({
        priorityOrder: r.priorityOrder ?? idx,
        matchField: r.matchField,
        matchOperator: r.matchOperator,
        matchValue: r.matchValue,
        behaviour: r.behaviour,
        procMin: r.procMin || 0,
        procMax: r.procMax || 0,
        isEnabled: r.isEnabled !== false,
      })),
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
