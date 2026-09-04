import React from "react";
import { formatDeliveryLine, formatDateValue } from "../../utils/formatter";
import "../../styles/widget-design.css";

export default function ResultCard({
  product,
  calculation,
  shipShort,
  shopperZone,
  shopData = {},
  simulatedDate = new Date(),
  selectedCountry = "IN",
}) {
  const isHidden = calculation.mode === "hide";
  const isError = calculation.mode === "error";

  // Widget Design Customization Settings from DB
  const containerStyle = shopData.widgetContainer || "none"; // "none" | "bordered" | "tinted"
  const alignment = shopData.widgetAlignment || "left"; // "left" | "center"
  const iconChoice = shopData.widgetIcon || "van"; // "van" | "box" | "calendar"
  const accentColor = shopData.widgetAccentColor || "#1A5D38";
  const showIcon = shopData.showDeliveryIcon !== false;
  const showCutoff = shopData.showCutoffCountdown !== false;
  const showBreakdown = shopData.showBreakdown !== false;

  // Fallback Setting: "ask" | "home" | "fallback"
  const isUnknownLocation = selectedCountry === "UNKNOWN";
  const isPromptingPincode =
    isUnknownLocation && (shopData.locationFallback || "ask") === "ask";

  // Format Date value
  let formattedDate = "";
  if (calculation.mode === "merchant") {
    formattedDate = calculation.merchantDate || "your specified date";
  } else if (calculation.mode === "ok") {
    formattedDate = formatDateValue({
      arriveMin: calculation.arriveMin,
      arriveMax: calculation.arriveMax,
      dateFormat: shopData.dateFormat || "range",
      dateStyle: shopData.dateStyle || "full",
      currentDate: simulatedDate,
    });
  }

  // Format Dynamic Delivery Lines using merchant templates
  const mainLineText = formatDeliveryLine({
    template: shopData.mainLine || "Get it {date}",
    arriveMin: calculation.arriveMin,
    arriveMax: calculation.arriveMax,
    dateFormat: shopData.dateFormat || "range",
    dateStyle: shopData.dateStyle || "full",
    zoneName: shopperZone?.name || "India domestic",
    currentDate: simulatedDate,
  });

  const supportingLineText = formatDeliveryLine({
    template:
      shopData.supportingLine ||
      `Dispatched from ${
        shopData.timezone?.split("/")[1]?.replace("_", " ") || "Kolkata"
      }`,
    arriveMin: calculation.arriveMin,
    arriveMax: calculation.arriveMax,
    dateFormat: shopData.dateFormat || "range",
    dateStyle: shopData.dateStyle || "full",
    zoneName: shopperZone?.name || "India domestic",
    currentDate: simulatedDate,
  });

  const transitText = `${shopperZone?.transitMin ?? 2}–${
    shopperZone?.transitMax ?? 4
  } days to ${shopperZone?.name || "India domestic"}`;

  // Cut-off Countdown Calculation
  const cutoffStr = shopData?.cutoffTime || "14:00";
  const [cutHours = 14, cutMinutes = 0] = cutoffStr.split(":").map(Number);
  const cutoffDate = new Date(simulatedDate);
  cutoffDate.setHours(cutHours, cutMinutes, 0, 0);

  const diffMs = cutoffDate.getTime() - simulatedDate.getTime();
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
  } else if (calculation.closedToday) {
    countdownText = "Closed today — we're back next open day";
  }

  // Render Delivery Icon SVG (van, box, calendar)
  const renderIcon = () => {
    if (!showIcon) return null;

    if (iconChoice === "box") {
      return (
        <svg
          className="deliverby-icon-svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    }

    if (iconChoice === "calendar") {
      return (
        <svg
          className="deliverby-icon-svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    }

    // Default "van"
    return (
      <svg
        className="deliverby-icon-svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    );
  };

  return (
    <div className="sim-card sim-result-card">
      <div className="sim-card-header">
        <h3 className="sim-card-title">Result</h3>
      </div>

      {/* Storefront Product Box */}
      <div className="storefront-mockup" style={{ marginBottom: 0 }}>
        <div className="product-mockup-title">{product.title}</div>
        <div className="product-mockup-price">{product.price}</div>
        <button type="button" className="product-mockup-atc" disabled>
          Add to cart
        </button>

        {/* DeliverBy Live Injected Widget */}
        {isHidden ? (
          <div
            style={{
              padding: "10px 12px",
              background: "#FFF5F5",
              border: "1px dashed #FFA8A8",
              borderRadius: "6px",
              fontSize: "11.5px",
              color: "#C5280C",
              textAlign: "center",
            }}
          >
            No delivery block shown (Hidden by Product Rule:{" "}
            <strong>{calculation.matchedRule?.matchValue || "Digital/Gift Card"}</strong>)
          </div>
        ) : isError ? (
          <div className="sim-error-message">
            <strong>Calculation could not proceed</strong>
            <p>{calculation.reason || "Please verify working days settings."}</p>
          </div>
        ) : (
          <div
            className={`deliverby-widget-box container-${containerStyle} align-${alignment}`}
          >
            {!isPromptingPincode ? (
              <>
                <div className="deliverby-main-row">
                  {showIcon && renderIcon()}
                  <div>
                    <div className="deliverby-main-title">
                      {mainLineText.includes(formattedDate) ? (
                        <>
                          {mainLineText.replace(formattedDate, "")}
                          <strong>{formattedDate}</strong>
                        </>
                      ) : (
                        mainLineText
                      )}
                    </div>
                    {supportingLineText && (
                      <div className="deliverby-supporting-text">
                        {supportingLineText}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cut-off Countdown pill */}
                {showCutoff && (
                  <div
                    className={`deliverby-cutoff-pill ${
                      isCountdownActive ? "active" : "passed"
                    }`}
                  >
                    {countdownText}
                  </div>
                )}

                {/* Dispatch & Transit Breakdown */}
                {showBreakdown && calculation.mode === "ok" && (
                  <div className="deliverby-breakdown-table">
                    <div className="deliverby-breakdown-row">
                      <span>Leaves us</span>
                      <span className="deliverby-breakdown-val">
                        {shipShort}
                      </span>
                    </div>
                    <div className="deliverby-breakdown-row">
                      <span>In transit</span>
                      <span className="deliverby-breakdown-val">
                        {transitText}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Geolocation Failed Mode */
              <div className="deliverby-pincode-prompt">
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "#4A4A4A",
                    fontWeight: 500,
                  }}
                >
                  {shopData.fallbackText ||
                    "Enter your postcode for a delivery date"}
                </div>
                <div className="deliverby-pincode-input-row">
                  <input
                    type="text"
                    className="wd-input"
                    style={{ height: "30px", fontSize: "12px" }}
                    placeholder="e.g. 560001 or 90210"
                    value=""
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ height: "30px" }}
                  >
                    Check
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
