import React from "react";
import { format } from "date-fns";
import { calculate } from "../../utils/calculator";
import { formatMoney } from "../../utils/currency";

function formatArrivalText(arriveMin, arriveMax) {
  const sameMonth = arriveMin.getMonth() === arriveMax.getMonth();
  const sameDay = arriveMin.getDate() === arriveMax.getDate() && sameMonth;

  if (sameDay) {
    return format(arriveMin, "d MMMM");
  }
  if (sameMonth) {
    return `${format(arriveMin, "d")}–${format(arriveMax, "d MMMM")}`;
  }
  return `${format(arriveMin, "d MMMM")} – ${format(arriveMax, "d MMMM")}`;
}

function formatShortRange(dMin, dMax) {
  const sameMonth = dMin.getMonth() === dMax.getMonth();
  const sameDay = dMin.getDate() === dMax.getDate() && sameMonth;

  if (sameDay) {
    return format(dMin, "d MMM");
  }
  if (sameMonth) {
    return `${format(dMin, "d")}–${format(dMax, "d MMM")}`;
  }
  return `${format(dMin, "d MMM")} – ${format(dMax, "d MMM")}`;
}

export function LivePreview({ formData = {}, currentStep = 1, currencyCode = "USD" }) {
  // 1. Pick sample product based on active step
  let product = {
    id: "tee",
    title: "Heavy Cotton Crew Tee",
    price: formatMoney(45, currencyCode),
    type: "Apparel",
    vendor: "Northfold Supply",
    stock: 42,
    tags: [],
  };

  if (currentStep === 4) {
    const madeToOrderRule = formData.rules?.find(
      (r) => r.isEnabled && r.matchValue?.toLowerCase().includes("made to order")
    );
    const preOrderRule = formData.rules?.find(
      (r) => r.isEnabled && r.matchValue?.toLowerCase().includes("preorder")
    );
    const digitalRule = formData.rules?.find(
      (r) => r.isEnabled && r.behaviour === "hide"
    );

    if (madeToOrderRule) {
      product = {
        id: "table",
        title: "Oak Dining Table, 6-seat",
        price: formatMoney(850, currencyCode),
        type: "Made to order",
        vendor: "Northfold Works",
        stock: 0,
        tags: [],
      };
    } else if (preOrderRule) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      product = {
        id: "drop",
        title: "Winter Drop Hoodie",
        price: formatMoney(75, currencyCode),
        type: "Apparel",
        vendor: "Northfold Supply",
        stock: 0,
        tags: ["preorder"],
        merchantDate: futureDate,
      };
    } else if (digitalRule) {
      product = {
        id: "card",
        title: "Digital Gift Card",
        price: formatMoney(25, currencyCode),
        type: "Digital",
        vendor: "Northfold Supply",
        stock: 999,
        tags: [],
      };
    }
  }

  // 2. Find matching zone for home country
  const homeCountry = formData.homeCountry || "IN";
  const matchedZone =
    formData.zones?.find((z) => z.isHome) ||
    formData.zones?.find((z) => z.countries?.includes(homeCountry)) ||
    formData.zones?.[0] || { name: "India domestic", transitMin: 2, transitMax: 4 };

  const countryNameMap = {
    IN: "India",
    US: "United States",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
  };
  const displayCountry = countryNameMap[homeCountry] || homeCountry;

  // 3. Compute live calculation result
  const now = new Date();
  const calculation = calculate({
    cutoffTime: formData.cutoffTime || "14:00",
    workingDays: formData.workingDays || [1, 2, 3, 4, 5, 6],
    closures: formData.closures || [],
    carrierSat: Boolean(formData.carrierSat),
    carrierSun: Boolean(formData.carrierSun),
    procMin: formData.procMin ?? 1,
    procMax: formData.procMax ?? 2,
    rules: formData.rules || [],
    shopSettings: formData,
    product,
    shopperZone: matchedZone,
    currentDate: now,
  });

  // 4. Format preview dates and notes
  let arrivalMainText = "";
  let shipShortText = "";
  let arriveShortText = "";
  let noteHtml = null;

  if (calculation.mode === "ok") {
    arrivalMainText = formatArrivalText(calculation.arriveMin, calculation.arriveMax);
    shipShortText = formatShortRange(calculation.shipMin, calculation.shipMax);
    arriveShortText = formatShortRange(calculation.arriveMin, calculation.arriveMax);

    noteHtml = (
      <span>
        Ordered now, this leaves you <b>{shipShortText}</b> and lands{" "}
        <b>{arriveShortText}</b>.{" "}
        {calculation.closedToday
          ? "Today is closed, so the clock starts on your next open day."
          : calculation.pastCutoff
          ? "Today's cut-off has already passed."
          : ""}
      </span>
    );
  } else if (calculation.mode === "merchant") {
    const merchantDateStr = calculation.merchantDate
      ? format(new Date(calculation.merchantDate), "d MMMM")
      : "a date you haven't set yet";
    arrivalMainText = merchantDateStr;
    noteHtml = (
      <span>Pre-order products show the date you set on the product itself, not an estimate.</span>
    );
  } else if (calculation.mode === "hide") {
    noteHtml = (
      <span>Nothing renders here — and on a live product page the block takes up no space at all.</span>
    );
  } else {
    noteHtml = <span>{calculation.reason || "No date can be worked out with these settings."}</span>;
  }

  const transitDaysText = `${matchedZone.transitMin ?? 2}–${matchedZone.transitMax ?? 4} days to ${matchedZone.name || "domestic"}`;

  return (
    <div className="live-preview-box">
      {/* Header */}
      <div className="preview-header">
        <span className="preview-live-dot" />
        <span>A shopper in {displayCountry}, right now</span>
      </div>

      {/* Stage */}
      <div className="preview-stage">
        <div className="preview-card">
          <div className="preview-img">
            {product.type === "Digital" ? "Delivered by email" : "Product image"}
          </div>
          <h4 className="preview-title">{product.title}</h4>
          <div className="preview-price">{product.price}</div>
          <div className="preview-atc">Add to cart</div>

          {/* DeliverBy Live Storefront Badge */}
          {calculation.mode === "hide" ? (
            <div className="edd-off" style={{ marginTop: "14px" }}>
              Block is hidden for this product
            </div>
          ) : (
            <div className="edd-storefront-widget">
              <div className="edd-top-row">
                <span className="edd-icon">
                  <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="#0C5132" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1.6" y="4.8" width="9.4" height="7.6" rx="1.2" />
                    <path d="M11 7.4h2.6l2.6 2.7v2.3H11z" />
                    <circle cx="4.9" cy="13.4" r="1.6" fill="#fff" stroke="#0C5132" />
                    <circle cx="12.8" cy="13.4" r="1.6" fill="#fff" stroke="#0C5132" />
                  </svg>
                </span>
                <div className="edd-content">
                  <div className="edd-main-line">
                    Get it <b>{arrivalMainText}</b>
                  </div>
                  <div className="edd-sub-line">
                    Dispatched from {displayCountry}
                  </div>

                  {calculation.mode === "ok" && (
                    <div className="edd-pill-timer">
                      {calculation.closedToday
                        ? "Closed today"
                        : calculation.pastCutoff
                        ? "Today's cut-off has passed"
                        : "Order within today's cut-off"}
                    </div>
                  )}
                </div>
              </div>

              {calculation.mode === "ok" && (
                <>
                  <div className="edd-breakdown-divider" />
                  <div className="edd-breakdown">
                    <div className="edd-breakdown-row">
                      <span className="edd-breakdown-label">Leaves us</span>
                      <span className="edd-breakdown-val">{shipShortText}</span>
                    </div>
                    <div className="edd-breakdown-row">
                      <span className="edd-breakdown-label">In transit</span>
                      <span className="edd-breakdown-val">{transitDaysText}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom explanation note */}
      <div className="preview-notes">
        {noteHtml}
      </div>
    </div>
  );
}