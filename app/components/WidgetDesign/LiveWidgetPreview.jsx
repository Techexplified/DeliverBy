import React, { useState } from "react";
import { format } from "date-fns";
import { calculate } from "../../utils/calculator";
import { formatDeliveryLine, formatDateValue } from "../../utils/formatter";
import { resolveZoneByCountry, detectCountryFromPostalCode } from "../../utils/geo";
import { COUNTRIES } from "../../routes/app.zones";
import { formatMoney } from "../../utils/currency";

export default function LiveWidgetPreview({
  widgetData,
  shopData,
  products,
  currencyCode = "USD",
}) {
  const [selectedProductId, setSelectedProductId] = useState(products?.[0]?.id || "");
  const [selectedCountryCode, setSelectedCountryCode] = useState(shopData?.homeCountry || "IN");
  const [simMode, setSimMode] = useState("normal"); // "normal" | "geofail"
  const [testPostalCode, setTestPostalCode] = useState("");
  const [postalDetectedCountry, setPostalDetectedCountry] = useState(null);

  const selectedProduct = (products || []).find((p) => p.id === selectedProductId) || products?.[0] || {
    title: "Heavy Cotton Crew Tee",
    productType: "Apparel",
    tags: [],
    variants: { nodes: [{ price: "2400.00" }] },
  };

  const rawPrice =
    selectedProduct?.variants?.nodes?.[0]?.price ??
    selectedProduct?.variants?.[0]?.price ??
    "2400.00";

  const productPrice = formatMoney(rawPrice, currencyCode);

  // Fallback Setting from Settings page: "ask" | "home" | "fallback"
  const fallbackSetting = shopData?.locationFallback || "ask";

  // Resolve active country & zone based on simulation mode and Settings
  let effectiveCountry = selectedCountryCode;
  let isPromptingPincode = false;
  let fallbackNote = null;

  if (simMode === "geofail") {
    if (fallbackSetting === "ask") {
      if (postalDetectedCountry) {
        effectiveCountry = postalDetectedCountry;
      } else {
        isPromptingPincode = true;
      }
    } else if (fallbackSetting === "home") {
      const homeZone = (shopData?.zones || []).find((z) => z.isHome);
      effectiveCountry = homeZone?.countries?.[0] || shopData?.homeCountry || "IN";
      fallbackNote = `Falling back to ${homeZone?.name || "Home zone"} (from Settings)`;
    } else if (fallbackSetting === "fallback") {
      effectiveCountry = "FALLBACK";
      const fallbackZone = (shopData?.zones || []).find((z) => z.isFallback);
      fallbackNote = `Falling back to ${fallbackZone?.name || "Rest of world zone"} (from Settings)`;
    }
  }

  const matchedZone = resolveZoneByCountry(effectiveCountry, shopData?.zones || []);

  // Run live calculation
  const now = new Date();
  const calculation = calculate({
    cutoffTime: shopData?.cutoffTime || "14:00",
    workingDays: shopData?.workingDays || [1, 2, 3, 4, 5, 6],
    closures: shopData?.closures || [],
    carrierSat: Boolean(shopData?.carrierSat),
    carrierSun: Boolean(shopData?.carrierSun),
    procMin: shopData?.procMin ?? 1,
    procMax: shopData?.procMax ?? 2,
    rules: shopData?.rules || [],
    shopSettings: shopData,
    product: {
      title: selectedProduct.title,
      type: selectedProduct.productType,
      productType: selectedProduct.productType,
      vendor: selectedProduct.vendor,
      tags: selectedProduct.tags,
      stock: selectedProduct.totalInventory ?? 10,
    },
    shopperZone: matchedZone,
    currentDate: now,
  });

  // Main & Supporting Lines
  let formattedDate = "";
  if (calculation.mode === "merchant") {
    formattedDate = calculation.merchantDate || "your specified date";
  } else if (calculation.mode === "ok") {
    formattedDate = formatDateValue({
      arriveMin: calculation.arriveMin,
      arriveMax: calculation.arriveMax,
      dateFormat: widgetData.dateFormat,
      dateStyle: widgetData.dateStyle,
      currentDate: now,
    });
  }

  const mainLineText = formatDeliveryLine({
    template: widgetData.mainLine,
    arriveMin: calculation.arriveMin,
    arriveMax: calculation.arriveMax,
    dateFormat: widgetData.dateFormat,
    dateStyle: widgetData.dateStyle,
    zoneName: matchedZone?.name || "India domestic",
    currentDate: now,
  });

  const supportingLineText = formatDeliveryLine({
    template: widgetData.supportingLine,
    arriveMin: calculation.arriveMin,
    arriveMax: calculation.arriveMax,
    dateFormat: widgetData.dateFormat,
    dateStyle: widgetData.dateStyle,
    zoneName: matchedZone?.name || "India domestic",
    currentDate: now,
  });

  // Short formatting for breakdown
  const shipShort = calculation.mode === "ok"
    ? calculation.shipMin.getMonth() === calculation.shipMax.getMonth()
      ? `${format(calculation.shipMin, "d")}–${format(calculation.shipMax, "d MMM")}`
      : `${format(calculation.shipMin, "d MMM")} – ${format(calculation.shipMax, "d MMM")}`
    : "1–2 days";

  const transitText = `${matchedZone?.transitMin ?? 2}–${matchedZone?.transitMax ?? 4} days to ${matchedZone?.name || "India domestic"}`;

  // Live Cut-off Countdown Calculation
  const cutoffStr = shopData?.cutoffTime || "14:00";
  const [cutHours = 14, cutMinutes = 0] = cutoffStr.split(":").map(Number);
  const cutoffDate = new Date(now);
  cutoffDate.setHours(cutHours, cutMinutes, 0, 0);

  const diffMs = cutoffDate.getTime() - now.getTime();
  const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
  const remainingMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let countdownText = "Today's cut-off has passed";
  let isCountdownActive = false;

  if (!calculation.closedToday && !calculation.pastCutoff && diffMs > 0) {
    isCountdownActive = true;
    if (remainingHours > 0) {
      countdownText = `Order within ${remainingHours}h ${remainingMins}m for today's dispatch`;
    } else {
      countdownText = `Order within ${remainingMins}m for today's dispatch`;
    }
  }

  const handleTestPostalCode = () => {
    if (!testPostalCode.trim()) return;
    const detected = detectCountryFromPostalCode(testPostalCode.trim());
    setPostalDetectedCountry(detected || "FALLBACK");
  };

  // Render Delivery Icon SVG
  const renderIcon = () => {
    const color = widgetData.widgetAccentColor || "#1A5D38";
    if (widgetData.widgetIcon === "box") {
      return (
        <svg className="deliverby-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      );
    }
    if (widgetData.widgetIcon === "calendar") {
      return (
        <svg className="deliverby-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      );
    }
    // Default Van
    return (
      <svg className="deliverby-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>
    );
  };

  const isHiddenByRule = widgetData.hideWhenNoRule && !calculation.matchedRule;

  return (
    <div className="wd-preview-card">
      <div className="wd-preview-header">
        <h3 className="wd-preview-title">Live preview</h3>
      </div>

      {/* Simulated Storefront Product Box */}
      <div className="storefront-mockup">
        <div className="product-placeholder-img" />
        <div className="product-mockup-title">{selectedProduct.title}</div>
        <div className="product-mockup-price">{productPrice}</div>
        <button type="button" className="product-mockup-atc">
          Add to cart
        </button>

        {/* DeliverBy Live Injected Widget */}
        {calculation.mode === "hide" ? (
          <div style={{ padding: "10px 12px", background: "#FFF5F5", border: "1px dashed #FFA8A8", borderRadius: "6px", fontSize: "11.5px", color: "#C5280C", textAlign: "center" }}>
            No delivery block shown (Hidden by Product Rule: <strong>{calculation.matchedRule?.matchValue}</strong>)
          </div>
        ) : (
          <div
            className={`deliverby-widget-box container-${widgetData.widgetContainer || "none"} align-${widgetData.widgetAlignment || "left"}`}
          >
            {!isPromptingPincode ? (
              <>
                <div className="deliverby-main-row">
                  {widgetData.showDeliveryIcon && renderIcon()}
                  <div>
                    <div className="deliverby-main-title">
                      {mainLineText.replace(formattedDate, "")}
                      <strong>{formattedDate}</strong>
                    </div>
                    {supportingLineText && (
                      <div className="deliverby-supporting-text">{supportingLineText}</div>
                    )}
                  </div>
                </div>

                {/* Cut-off Countdown pill */}
                {widgetData.showCutoffCountdown && (
                  <div className={`deliverby-cutoff-pill ${isCountdownActive ? "active" : "passed"}`}>
                    {countdownText}
                  </div>
                )}

                {/* Dispatch & Transit Breakdown */}
                {widgetData.showBreakdown && (
                  <div className="deliverby-breakdown-table">
                    <div className="deliverby-breakdown-row">
                      <span>Leaves us</span>
                      <span className="deliverby-breakdown-val">{shipShort}</span>
                    </div>
                    <div className="deliverby-breakdown-row">
                      <span>In transit</span>
                      <span className="deliverby-breakdown-val">{transitText}</span>
                    </div>
                  </div>
                )}

                {/* Reset test postcode link if in geofail mode */}
                {simMode === "geofail" && postalDetectedCountry && (
                  <div style={{ marginTop: "8px", textAlign: "right" }}>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "#005BD3", fontSize: "11px", cursor: "pointer", padding: 0 }}
                      onClick={() => {
                        setPostalDetectedCountry(null);
                        setTestPostalCode("");
                      }}
                    >
                      ↺ Test another postcode
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Geolocation Failed Fallback Mode */
              <div className="deliverby-pincode-prompt">
                <div style={{ fontSize: "12.5px", color: "#4A4A4A", fontWeight: 500 }}>
                  {widgetData.fallbackText || "Enter your postcode for a delivery date"}
                </div>
                <div className="deliverby-pincode-input-row">
                  <input
                    type="text"
                    className="wd-input"
                    style={{ height: "30px", fontSize: "12px" }}
                    placeholder="e.g. 560001 or 90210"
                    value={testPostalCode}
                    onChange={(e) => setTestPostalCode(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ height: "30px" }}
                    onClick={handleTestPostalCode}
                  >
                    Check
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simulation Mode Segmented Tabs */}
      <div style={{ marginBottom: "12px" }}>
        <label className="wd-label" style={{ fontSize: "12px", color: "#616161" }}>
          Shopper location state
        </label>
        <div className="wd-seg-control">
          <button
            type="button"
            className={`wd-seg-btn ${simMode === "normal" ? "active" : ""}`}
            onClick={() => {
              setSimMode("normal");
              setPostalDetectedCountry(null);
            }}
          >
            Auto-detected
          </button>
          <button
            type="button"
            className={`wd-seg-btn ${simMode === "geofail" ? "active" : ""}`}
            onClick={() => {
              setSimMode("geofail");
              setPostalDetectedCountry(null);
            }}
          >
            Geolocation failed
          </button>
        </div>

        {simMode === "geofail" && fallbackNote && (
          <div style={{ fontSize: "11.5px", color: "#616161", marginTop: "6px" }}>
            {fallbackNote} (<a href="/app/settings" style={{ color: "#005BD3", textDecoration: "underline" }}>Settings</a>)
          </div>
        )}
      </div>

      {/* Preview Product Dropdown */}
      <div style={{ marginBottom: "12px" }}>
        <label className="wd-label" style={{ fontSize: "12px", color: "#616161" }}>
          Preview product
        </label>
        <select
          className="wd-input"
          style={{ height: "32px", fontSize: "12px" }}
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
        >
          {(products || []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {/* Preview Shopper In (Only shown when in Auto-detected mode) */}
      {simMode === "normal" ? (
        <div>
          <label className="wd-label" style={{ fontSize: "12px", color: "#616161" }}>
            Preview shopper in
          </label>
          <select
            className="wd-input"
            style={{ height: "32px", fontSize: "12px" }}
            value={selectedCountryCode}
            onChange={(e) => {
              setSelectedCountryCode(e.target.value);
              setPostalDetectedCountry(null);
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div style={{ padding: "8px 10px", background: "#F6F6F7", borderRadius: "6px", fontSize: "11.5px", color: "#616161" }}>
          📍 Shopper's country is unknown. Test how entering a PIN/ZIP code in the widget resolves delivery.
        </div>
      )}
    </div>
  );
}
