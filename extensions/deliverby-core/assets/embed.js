// extensions/deliverby-core/assets/embed.js
(function () {
  "use strict";

  // Prevent multiple script executions
  if (window.__deliverby_loaded) return;
  window.__deliverby_loaded = true;

  // 1. Inject Styles once into document head
  function injectStyles() {
    if (document.getElementById("deliverby-widget-styles")) return;

    const style = document.createElement("style");
    style.id = "deliverby-widget-styles";
    style.textContent = `
      .deliverby-widget {
        font-family: inherit;
        font-size: 13px;
        line-height: 1.45;
        color: #303030;
        margin: 12px 0 16px;
        width: 100%;
        max-width: 44rem;
        box-sizing: border-box;
      }
      .deliverby-widget * {
        box-sizing: border-box;
      }
      .deliverby-container-none {
        background: transparent;
        border: 0;
        padding: 4px 0;
      }
      .deliverby-container-bordered {
        background: #ffffff;
        border: 1px solid #E3E3E3;
        border-radius: 8px;
        padding: 10px 12px;
      }
      .deliverby-container-tinted {
        background: #F7F9FA;
        border: 1px solid #EAEAEA;
        border-radius: 8px;
        padding: 10px 12px;
      }
      .deliverby-align-center {
        text-align: center;
      }
      .deliverby-align-center .deliverby-main-row {
        justify-content: center;
      }
      .deliverby-align-center .deliverby-breakdown-row {
        justify-content: center;
        gap: 16px;
      }
      .deliverby-main-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      .deliverby-icon-box {
        flex: 0 0 auto;
        margin-top: 1px;
      }
      .deliverby-main-text {
        font-size: 13.5px;
        color: #1a1a1a;
      }
      .deliverby-main-text strong {
        font-weight: 700;
      }
      .deliverby-supporting-text {
        font-size: 12px;
        color: #616161;
        margin-top: 2px;
      }
      .deliverby-cutoff-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 9px;
        border-radius: 12px;
        margin-top: 8px;
        transition: all 0.2s ease;
      }
      .deliverby-cutoff-pill.active {
        background: #FFF8E6;
        border: 1px solid #FFE299;
        color: #8A5800;
      }
      .deliverby-cutoff-pill.passed {
        background: #F1F1F1;
        border: 1px solid #E3E3E3;
        color: #616161;
        font-weight: 500;
      }
      .deliverby-breakdown-table {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #EBEBEB;
        font-size: 12px;
        color: #616161;
      }
      .deliverby-breakdown-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .deliverby-breakdown-row:last-child {
        margin-bottom: 0;
      }
      .deliverby-breakdown-val {
        color: #202020;
        font-weight: 600;
      }
      .deliverby-pincode-prompt {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .deliverby-pincode-input-row {
        display: flex;
        gap: 6px;
      }
      .deliverby-pincode-input {
        flex: 1;
        height: 32px;
        padding: 0 10px;
        border: 1px solid #CDCDCD;
        border-radius: 6px;
        font-size: 12.5px;
        background: #ffffff;
        outline: none;
      }
      .deliverby-pincode-input:focus {
        border-color: #005BD3;
      }
      .deliverby-pincode-btn {
        height: 32px;
        padding: 0 12px;
        background: #303030;
        color: #ffffff;
        border: 0;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.1s ease;
      }
      .deliverby-pincode-btn:hover {
        background: #1a1a1a;
      }
      .deliverby-reset-link {
        font-size: 11px;
        color: #005BD3;
        background: none;
        border: none;
        padding: 0;
        margin-top: 6px;
        cursor: pointer;
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
  }

  // 2. SVG Icon Generator
  function getIconSvg(type, color) {
    if (type === "box") {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
    }
    if (type === "calendar") {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    }
    // Default Van
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
  }

  // 3. True Country Detection via Shopify Context / Cache / URL
  async function detectShopperCountry(liquidCountry) {
    // 1. Check Shopify Theme Preview URL parameters (e.g. ?_country=AF or ?country=AF)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCountry = urlParams.get("_country") || urlParams.get("country");
      if (urlCountry && urlCountry.trim()) {
        return urlCountry.trim().toUpperCase();
      }
    } catch (e) {
      // Ignore URL parsing error
    }

    // 2. Check Shopify Localization (Market selector)
    if (liquidCountry && typeof liquidCountry === "string" && liquidCountry.trim()) {
      return liquidCountry.trim().toUpperCase();
    }

    // 3. Check active Shopify window object
    if (window.Shopify && window.Shopify.country) {
      return window.Shopify.country.toUpperCase();
    }

    // 4. Check IP suggestions
    try {
      const res = await fetch("/browsing_context_suggestions.json");
      if (res.ok) {
        const data = await res.json();
        const detected = data?.detected_values?.country?.handle;
        if (detected) {
          return detected.toUpperCase();
        }
      }
    } catch (e) {
      // Ignore network errors
    }

    return "IN";
  }

  // 4. Countdown Timer Engine
  function setupLiveCountdown(pillElement, cutoffTime, closedToday, pastCutoff) {
    if (!pillElement || !cutoffTime) return;

    function update() {
      if (closedToday) {
        pillElement.className = "deliverby-cutoff-pill passed";
        pillElement.textContent = "Today's cut-off has passed";
        return;
      }

      const now = new Date();
      const parts = cutoffTime.split(":");
      const cutHours = parseInt(parts[0], 10) || 14;
      const cutMins = parseInt(parts[1], 10) || 0;

      const target = new Date(now);
      target.setHours(cutHours, cutMins, 0, 0);

      const diffMs = target.getTime() - now.getTime();

      if (diffMs > 0 && !pastCutoff) {
        const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
        const remainingMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        pillElement.className = "deliverby-cutoff-pill active";
        if (remainingHours > 0) {
          pillElement.textContent = `Order within ${remainingHours}h ${remainingMins}m for today's dispatch`;
        } else {
          pillElement.textContent = `Order within ${remainingMins}m for today's dispatch`;
        }
      } else {
        pillElement.className = "deliverby-cutoff-pill passed";
        pillElement.textContent = "Today's cut-off has passed";
      }
    }

    update();
    const timerId = setInterval(update, 30000); // Check every 30 seconds
    pillElement._timerId = timerId;
  }

  // 5. Render Widget Inside Container
  function renderWidget(container, payload, onCheckPostalCode, onResetPostalCode) {
    // Clear previous timer if exists
    const oldPill = container.querySelector(".deliverby-cutoff-pill");
    if (oldPill && oldPill._timerId) clearInterval(oldPill._timerId);

    if (!payload || !payload.show) {
      container.innerHTML = "";
      return;
    }

    const design = payload.design || {};
    const containerClass = `deliverby-container-${design.container || "none"}`;
    const alignClass = `deliverby-align-${design.alignment || "left"}`;

    // Fallback PIN Code Prompt Mode
    if (payload.fallback && payload.fallback.isFallbackMode) {
      container.innerHTML = `
        <div class="deliverby-widget ${containerClass} ${alignClass}">
          <div class="deliverby-pincode-prompt">
            <div style="font-size: 12.5px; color: #4A4A4A; font-weight: 500;">
              ${payload.fallback.text || "Enter your postcode for a delivery date"}
            </div>
            <div class="deliverby-pincode-input-row">
              <input type="text" class="deliverby-pincode-input" placeholder="e.g. 560001 or 90210" />
              <button type="button" class="deliverby-pincode-btn">Check</button>
            </div>
          </div>
        </div>
      `;

      const input = container.querySelector(".deliverby-pincode-input");
      const btn = container.querySelector(".deliverby-pincode-btn");

      const handleCheck = () => {
        const val = input.value.trim();
        if (val) onCheckPostalCode(val);
      };

      btn.addEventListener("click", handleCheck);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleCheck();
      });
      return;
    }

    // Normal Delivery Date Mode
    let iconHtml = "";
    if (design.showIcon !== false) {
      iconHtml = `<div class="deliverby-icon-box">${getIconSvg(design.icon, design.accentColor || "#1A5D38")}</div>`;
    }

    let cutoffHtml = "";
    if (payload.cutoff && payload.cutoff.show) {
      cutoffHtml = `<div class="deliverby-cutoff-pill"></div>`;
    }

    let breakdownHtml = "";
    if (payload.breakdown && payload.breakdown.show) {
      breakdownHtml = `
        <div class="deliverby-breakdown-table">
          <div class="deliverby-breakdown-row">
            <span>Leaves us</span>
            <span class="deliverby-breakdown-val">${payload.breakdown.leavesUs || ""}</span>
          </div>
          <div class="deliverby-breakdown-row">
            <span>In transit</span>
            <span class="deliverby-breakdown-val">${payload.breakdown.inTransit || ""}</span>
          </div>
        </div>
      `;
    }

    let resetPostalHtml = "";
    if (payload._hasCustomPostal) {
      resetPostalHtml = `<div><button type="button" class="deliverby-reset-link">Change PIN code</button></div>`;
    }

    // Highlight the calculated date in main text
    let mainLineHtml = payload.mainLine || "";
    if (payload.formattedDate && mainLineHtml.includes(payload.formattedDate)) {
      mainLineHtml = mainLineHtml.replace(
        payload.formattedDate,
        `<strong>${payload.formattedDate}</strong>`
      );
    }

    container.innerHTML = `
      <div class="deliverby-widget ${containerClass} ${alignClass}">
        <div class="deliverby-main-row">
          ${iconHtml}
          <div>
            <div class="deliverby-main-text">${mainLineHtml}</div>
            ${payload.supportingLine ? `<div class="deliverby-supporting-text">${payload.supportingLine}</div>` : ""}
          </div>
        </div>
        ${cutoffHtml}
        ${breakdownHtml}
        ${resetPostalHtml}
      </div>
    `;

    // Initialize Countdown Timer
    if (payload.cutoff && payload.cutoff.show) {
      const pill = container.querySelector(".deliverby-cutoff-pill");
      setupLiveCountdown(
        pill,
        payload.cutoff.cutoffTime,
        payload.cutoff.closedToday,
        payload.cutoff.pastCutoff
      );
    }

    // Initialize Reset Postal button if present
    if (payload._hasCustomPostal) {
      const resetBtn = container.querySelector(".deliverby-reset-link");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => onResetPostalCode());
      }
    }
  }

  // 6. Main Widget Lifecycle
  async function initWidget(container) {
    const dataset = container.dataset;
    const shop = dataset.shop;
    const appUrl = (dataset.appUrl || "").replace(/\/+$/, "") || window.location.origin;

    if (!shop) return;

    // Detect shopper country
    const country = await detectShopperCountry(dataset.country);

    async function fetchAndRender(customPostal = null) {
      try {
        const queryParams = new URLSearchParams({
          shop: shop,
          country: country || "",
          postalCode: customPostal || "",
          productTitle: dataset.productTitle || "",
          productType: dataset.productType || "",
          vendor: dataset.productVendor || "",
          tags: dataset.productTags || "",
          stock: dataset.inventoryQuantity || "",
        });

        const res = await fetch(`${appUrl}/api/deliverby?${queryParams.toString()}`);
        if (!res.ok) return;

        const data = await res.json();
        data._hasCustomPostal = Boolean(customPostal);

        renderWidget(
          container,
          data,
          (enteredPostal) => fetchAndRender(enteredPostal),
          () => fetchAndRender(null)
        );
      } catch (e) {
        console.error("DeliverBy Widget Load Error:", e);
      }
    }

    fetchAndRender();
  }

  // 7. Bootstrapper
  function boot() {
    injectStyles();
    const containers = document.querySelectorAll(".deliverby-widget-root");
    containers.forEach((el) => initWidget(el));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();