import React, { useState, useEffect } from "react";
import { redirect, data, useFetcher, useLoaderData, Link } from "react-router";
import { embedRedirect } from "../utils/shopify-embed-nav.server.js";
import { format, addDays, isSameDay, differenceInCalendarDays, startOfDay, endOfDay } from "date-fns";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { calculate, isWorkDay } from "../utils/calculator";
import { COUNTRIES } from "../components/Onboarding/steps";
import { formatDeliveryLine, formatDateValue } from "../utils/formatter.js";
import { formatMoney } from "../utils/currency.js";
import "../styles/onboarding.css";
import "../styles/overview.css";
import "../styles/widget-design.css";

export async function loader({ request }) {
    const { admin, session } = await authenticate.admin(request);
    const shopName = session.shop;
    const url = new URL(request.url);

    const [settingsData, productResponse] = await Promise.all([
        db.shop.findUnique({
            where: { shop: shopName },
            include: {
                closures: true,
                zones: true,
                rules: { orderBy: { priorityOrder: "asc" } },
            },
        }),
        admin.graphql(`
      query getProducts {
        shop {
          currencyCode
        }
        products(first: 50) {
          nodes {
            id
            title
            handle
            vendor
            productType
            tags
            totalInventory
            variants(first: 1) {
              nodes {
                price
              }
            }
          }
        }
      }
    `),
    ]);

    if (!settingsData || !settingsData?.isOnboarded) {
        return embedRedirect("/app/onboarding", request);
    }

    const productJson = await productResponse.json();
    const currencyCode = productJson?.data?.shop?.currencyCode || "USD";
    const productData = productJson?.data?.products?.nodes || [];

    return data({
        settingsData,
        productData,
        storeHandle: shopName.split(".")[0],
        currencyCode,
    });
}

function formatArrivalText(arriveMin, arriveMax) {
    const sameMonth = arriveMin.getMonth() === arriveMax.getMonth();
    const sameDay = arriveMin.getDate() === arriveMax.getDate() && sameMonth;

    if (sameDay) return format(arriveMin, "d MMMM");
    if (sameMonth) return `${format(arriveMin, "d")}–${format(arriveMax, "d MMMM")}`;
    return `${format(arriveMin, "d MMMM")} – ${format(arriveMax, "d MMMM")}`;
}

function formatShortRange(dMin, dMax) {
    const sameMonth = dMin.getMonth() === dMax.getMonth();
    const sameDay = dMin.getDate() === dMax.getDate() && sameMonth;

    if (sameDay) return format(dMin, "d MMM");
    if (sameMonth) return `${format(dMin, "d")}–${format(dMax, "d MMM")}`;
    return `${format(dMin, "d MMM")} – ${format(dMax, "d MMM")}`;
}

export default function OverviewPage() {
    const { settingsData, productData, storeHandle, currencyCode } = useLoaderData();
    const embedfetcher = useFetcher();
    const [checkedEmbed, setCheckedEmbed] = useState(false);
    const themeCustomizerUrl = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor?template=product`;

    useEffect(() => {
        if (embedfetcher.state === "idle" && embedfetcher.data) {
            setCheckedEmbed(true);
        }
    }, [embedfetcher.data, embedfetcher.state]);

    // 1. Theme Embed Live Check
    const isEmbedded = Boolean(embedfetcher?.data?.isEmbedded);
    useEffect(() => {
        embedfetcher.load("/app/api/check-embed");

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                embedfetcher.load("/app/api/check-embed");
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    // 2. Interactive Selection State
    // If productData has products, use first one, otherwise default placeholder
    const initialProduct = productData.length > 0 ? productData[0] : {
        id: "default-tee",
        title: "Heavy Cotton Crew Tee",
        productType: "Apparel",
        tags: [],
        variants: { nodes: [{ price: "2400.00" }] }
    };

    const [selectedProductId, setSelectedProductId] = useState(initialProduct.id);
    const [selectedCountry, setSelectedCountry] = useState(settingsData.homeCountry || "IN");

    const selectedProductRaw = productData.find((p) => p.id === selectedProductId) || initialProduct;
    const rawPrice = selectedProductRaw.variants?.nodes?.[0]?.price ?? "2400.00";
    const productPrice = formatMoney(rawPrice, currencyCode);

    const productForCalc = {
        id: selectedProductRaw.id,
        title: selectedProductRaw.title,
        type: selectedProductRaw.productType || "",
        tags: selectedProductRaw.tags || [],
        vendor: selectedProductRaw.vendor,
        stock: selectedProductRaw.totalInventory,
        price: productPrice,
    };

    // 3. Matched Zone
    const matchedZone =
        settingsData.zones?.find((z) => z.countries?.includes(selectedCountry)) ||
        settingsData.zones?.find((z) => z.isFallback) ||
        settingsData.zones?.[0] || { name: "Domestic", transitMin: 2, transitMax: 4 };

    const selectedCountryName = COUNTRIES.find((c) => c.code === selectedCountry)?.name || selectedCountry;

    // 4. Run Live Calculation
    const now = new Date();
    const calculation = calculate({
        cutoffTime: settingsData.cutoffTime || "14:00",
        workingDays: settingsData.workingDays || [1, 2, 3, 4, 5, 6],
        closures: settingsData.closures || [],
        carrierSat: Boolean(settingsData.carrierSat),
        carrierSun: Boolean(settingsData.carrierSun),
        procMin: settingsData.procMin ?? 1,
        procMax: settingsData.procMax ?? 2,
        rules: settingsData.rules || [],
        shopSettings: settingsData,
        product: productForCalc,
        shopperZone: matchedZone,
        currentDate: now,
    });

    const arrivalMainText = calculation.mode === "ok"
        ? formatArrivalText(calculation.arriveMin, calculation.arriveMax)
        : "No estimate";

    const shipShort = calculation.mode === "ok"
        ? formatShortRange(calculation.shipMin, calculation.shipMax)
        : "";

    const arriveShort = calculation.mode === "ok"
        ? formatShortRange(calculation.arriveMin, calculation.arriveMax)
        : "";

    // 5. Widget Customization Settings & Formatting
    const containerStyle = settingsData.widgetContainer || "none";
    const alignment = settingsData.widgetAlignment || "left";
    const iconChoice = settingsData.widgetIcon || "van";
    const accentColor = settingsData.widgetAccentColor || "#1A5D38";
    const showIcon = settingsData.showDeliveryIcon !== false;
    const showCutoff = settingsData.showCutoffCountdown !== false;
    const showBreakdown = settingsData.showBreakdown !== false;

    let formattedDate = "";
    if (calculation.mode === "merchant") {
        formattedDate = calculation.merchantDate || "your specified date";
    } else if (calculation.mode === "ok") {
        formattedDate = formatDateValue({
            arriveMin: calculation.arriveMin,
            arriveMax: calculation.arriveMax,
            dateFormat: settingsData.dateFormat || "range",
            dateStyle: settingsData.dateStyle || "full",
            currentDate: now,
        });
    }

    const mainLineText = formatDeliveryLine({
        template: settingsData.mainLine || "Get it {date}",
        arriveMin: calculation.arriveMin,
        arriveMax: calculation.arriveMax,
        dateFormat: settingsData.dateFormat || "range",
        dateStyle: settingsData.dateStyle || "full",
        zoneName: matchedZone?.name || "India domestic",
        currentDate: now,
    });

    const supportingLineText = formatDeliveryLine({
        template:
            settingsData.supportingLine ||
            `Dispatched from ${
                settingsData.timezone?.split("/")[1]?.replace("_", " ") || "Kolkata"
            }`,
        arriveMin: calculation.arriveMin,
        arriveMax: calculation.arriveMax,
        dateFormat: settingsData.dateFormat || "range",
        dateStyle: settingsData.dateStyle || "full",
        zoneName: matchedZone?.name || "India domestic",
        currentDate: now,
    });

    const transitText = `${matchedZone?.transitMin ?? 2}–${
        matchedZone?.transitMax ?? 4
    } days to ${matchedZone?.name || "India domestic"}`;

    // Cut-off Countdown Calculation
    const cutoffStr = settingsData.cutoffTime || "14:00";
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
    } else if (calculation.closedToday) {
        countdownText = "Closed today — we're back next open day";
    }

    const renderIcon = () => {
        if (!showIcon) return null;
        if (iconChoice === "box") {
            return (
                <svg className="deliverby-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
            );
        }
        if (iconChoice === "calendar") {
            return (
                <svg className="deliverby-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
            );
        }
        return (
            <svg className="deliverby-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
        );
    };

    // 6. Build Day-by-Day Timeline Strip
    const timelineDays = [];
    if (calculation.mode === "ok") {
        const totalDays = Math.min(35, differenceInCalendarDays(calculation.arriveMax, now) + 2);
        const startDay = startOfDay(now);
        const shipMinDay = startOfDay(calculation.shipMin);
        const shipMaxDay = endOfDay(calculation.shipMax);
        const arriveMinDay = startOfDay(calculation.arriveMin);
        const arriveMaxDay = endOfDay(calculation.arriveMax);

        for (let i = 0; i < totalDays; i++) {
            const dayDate = addDays(startDay, i);
            const isOrder = i === 0;
            const isClosed = !isWorkDay(dayDate, settingsData.workingDays, settingsData.closures);

            const isPacking = dayDate >= shipMinDay && dayDate <= shipMaxDay;
            const isArrival = dayDate >= arriveMinDay && dayDate <= arriveMaxDay;

            let type = "regular";
            let tag = "";

            if (isOrder) {
                type = "order";
                tag = "ORDER";
            } else if (isArrival) {
                type = "arrival";
                if (isSameDay(dayDate, calculation.arriveMin)) tag = "ARRIVES";
                else if (isSameDay(dayDate, calculation.arriveMax)) tag = "LATEST";
            } else if (isPacking) {
                type = "packing";
                if (isSameDay(dayDate, calculation.shipMin)) tag = "SHIPS";
                else if (isSameDay(dayDate, calculation.shipMax)) tag = "LATEST";
            } else if (isClosed) {
                type = "closed";
            }

            timelineDays.push({
                date: dayDate,
                dayLetter: format(dayDate, "EEEEE"),
                dayNumber: format(dayDate, "d"),
                type,
                tag,
            });
        }
    }

    const totalCalendarDays = calculation.mode === "ok"
        ? differenceInCalendarDays(calculation.arriveMax, now) + 1
        : 0;

    return (
        <div className="overview-page">
            {/* Top Header */}
            <div className="ov-header">
                <div>
                    <div className="ov-title-row">
                        <h1 className="ov-title">Overview</h1>
                        { checkedEmbed && 
                        <span className={isEmbedded ? "badge-live-storefront" : "badge-off-storefront"}>
                            {isEmbedded ? "Live on storefront" : "Off storefront"}
                        </span>
                        }
                    </div>
                    <p className="ov-subtitle">
                        Everything DeliverBy is doing on your storefront right now.
                    </p>
                </div>

                <div>
                    <Link to="/app/test" className="btn">
                        Run a test
                    </Link>
                </div>
            </div>

            {/* Top Status Banner */}
            {checkedEmbed && (
                <div className={`ov-banner ${isEmbedded ? "ov-banner-live" : "ov-banner-off"}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div className="ov-banner-icon">
                            {isEmbedded ? "✓" : "!"}
                        </div>
                        <div className="ov-banner-text">
                            <h4>{isEmbedded ? "The block is live on your product pages" : "The block is not live on your theme yet"}</h4>
                            <p>
                                {isEmbedded
                                    ? "Every shopper runs through the same five steps below, using the settings in this app."
                                    : "Enable DeliverBy in your theme customizer to start displaying delivery promises."}
                            </p>
                        </div>
                    </div>

                    {!isEmbedded && (
                        <div>
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ whiteSpace: "nowrap" }}
                                onClick={() => window.open(themeCustomizerUrl, "_blank", "noopener,noreferrer")}
                            >
                                Add to theme
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* "How today's date is worked out" Live Trace Card */}
            <div className="ov-card">
                <div className="ov-card-header">
                    <div>
                        <h3 className="ov-card-title">How today's date is worked out</h3>
                        <p className="ov-card-subtitle">
                            A live trace through your current settings. Every shopper goes through these same steps.
                        </p>
                    </div>

                    <div className="ov-controls">
                        {/* Product dropdown */}
                        {productData.length > 0 ? (
                            <select
                                className="ov-select"
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                            >
                                {productData.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.title}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <select className="ov-select" disabled>
                                <option>{initialProduct.title}</option>
                            </select>
                        )}

                        {/* Shopper Location dropdown */}
                        <select
                            className="ov-select"
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                        >
                            {COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                    Shopper in {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 5-Step Trace List */}
                <div className="trace-list">
                    {/* Step 1 */}
                    <div className="trace-step">
                        <div className="trace-step-left">
                            <div className="trace-num">1</div>
                            <div className="trace-info">
                                <h4>Order is placed</h4>
                                <p>The clock starts here.</p>
                            </div>
                        </div>
                        <div className="trace-val">
                            {format(now, "EEE d MMM, HH:mm")}
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="trace-step">
                        <div className="trace-step-left">
                            <div className="trace-num">2</div>
                            <div className="trace-info">
                                <h4>Cut-off is checked</h4>
                                <p>
                                    {calculation.pastCutoff
                                        ? "Ordered after the cut-off, so this joins tomorrow's dispatch."
                                        : "Ordered before the cut-off, so this is packed today."}
                                </p>
                                <Link to="/app/processing-time" className="trace-link">Change this</Link>
                            </div>
                        </div>
                        <div className="trace-val">
                            Cut-off {settingsData.cutoffTime || "14:00"}
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="trace-step">
                        <div className="trace-step-left">
                            <div className="trace-num">3</div>
                            <div className="trace-info">
                                <h4>Dispatch time is added</h4>
                                <p>Working days only. Weekends and closures are skipped.</p>
                                <Link to="/app/processing-time" className="trace-link">Change this</Link>
                            </div>
                        </div>
                        <div className="trace-val">
                            {settingsData.procMin ?? 1}–{settingsData.procMax ?? 2} days
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="trace-step">
                        <div className="trace-step-left">
                            <div className="trace-num">4</div>
                            <div className="trace-info">
                                <h4>Transit time is added</h4>
                                <p>Counted on the carrier's calendar for {matchedZone.name || "domestic"}.</p>
                                <Link to="/app/zones" className="trace-link">Change this</Link>
                            </div>
                        </div>
                        <div className="trace-val">
                            {matchedZone.transitMin ?? 2}–{matchedZone.transitMax ?? 4} days
                        </div>
                    </div>

                    {/* Step 5 (Final Highlighted Step) */}
                    <div className="trace-step trace-step-final">
                        <div className="trace-step-left">
                            <div className="trace-num trace-num-final">✓</div>
                            <div className="trace-info">
                                <h4>The shopper sees this</h4>
                                <p>Rendered on the product page.</p>
                                <Link to="/app/widget-customization" className="trace-link">Change this</Link>
                            </div>
                        </div>
                        <div className="trace-val trace-val-final">
                            {arriveShort}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Two Columns (What the shopper sees & Day by day) */}
            <div className="ov-grid">
                {/* Column 1: What the shopper sees */}
                <div className="ov-card">
                    <div className="ov-card-header">
                        <h3 className="ov-card-title">What the shopper sees</h3>
                        <span className="badge-draft">Product page</span>
                    </div>

                    <div className="storefront-mockup" style={{ marginBottom: 0 }}>
                        <div className="product-mockup-title">{productForCalc.title}</div>
                        <div className="product-mockup-price">{productForCalc.price}</div>
                        <button type="button" className="product-mockup-atc" disabled>
                            Add to cart
                        </button>

                        {/* DeliverBy Live Injected Widget */}
                        {calculation.mode === "hide" ? (
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
                        ) : (
                            <div
                                className={`deliverby-widget-box container-${containerStyle} align-${alignment}`}
                            >
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
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Day by day Timeline */}
                <div className="ov-card">
                    <div className="ov-card-header">
                        <h3 className="ov-card-title">Day by day</h3>
                    </div>

                    {/* Legend */}
                    <div className="timeline-legend">
                        <span className="legend-chip legend-packing">Packing</span>
                        <span className="legend-chip legend-arrival">Arrival window</span>
                    </div>

                    {/* Calendar Strip */}
                    <div className="timeline-strip">
                        {timelineDays.map((day, idx) => (
                            <div key={idx} className="timeline-day">
                                <span className="day-name">{day.dayLetter}</span>
                                <div className={`day-box ${day.type}`}>
                                    {day.dayNumber}
                                </div>
                                <span className="day-tag">{day.tag}</span>
                            </div>
                        ))}
                    </div>

                    {/* Summary Footer */}
                    <div className="timeline-footer">
                        <span>Total <b>{totalCalendarDays} days</b></span>
                        <span>Dispatch <b>{shipShort}</b></span>
                        <span>Arrives <b>{arriveShort}</b></span>
                        <span style={{ color: "#8A8A8A" }}>Hatched days are closed</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
