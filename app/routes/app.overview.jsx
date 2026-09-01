import React, { useState, useEffect } from "react";
import { redirect, data, useFetcher, useLoaderData, Link } from "react-router";
import { format, addDays, isSameDay, differenceInCalendarDays, startOfDay, endOfDay } from "date-fns";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { calculate, isWorkDay } from "../utils/calculator";
import { COUNTRIES } from "../components/Onboarding/steps";
import "../styles/onboarding.css";
import "../styles/overview.css";

export async function loader({ request }) {
    const { admin, session } = await authenticate.admin(request);
    const shopName = session.shop;

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
        products(first: 10) {
          nodes {
            id
            title
            productType
            tags
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
        return redirect("/app/onboarding");
    }

    const productJson = await productResponse.json();
    const productData = productJson?.data?.products?.nodes || [];

    return data({
        settingsData,
        productData,
        storeHandle: shopName.split(".")[0],
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
    const { settingsData, productData, storeHandle } = useLoaderData();
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
    const productPrice = selectedProductRaw.variants?.nodes?.[0]?.price
        ? `₹${parseFloat(selectedProductRaw.variants.nodes[0].price).toLocaleString()}`
        : "₹2,400.00";

    const productForCalc = {
        id: selectedProductRaw.id,
        title: selectedProductRaw.title,
        type: selectedProductRaw.productType || "",
        tags: selectedProductRaw.tags || [],
        stock: 20,
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

    // 5. Build Day-by-Day Timeline Strip
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
                    <Link to="/app" className="btn">
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

                    <div className="preview-card" style={{ boxShadow: "none" }}>
                        <div className="preview-img">
                            {productForCalc.type === "Digital" ? "Delivered by email" : "Product image"}
                        </div>
                        <h4 className="preview-title">{productForCalc.title}</h4>
                        <div className="preview-price">{productForCalc.price}</div>
                        <div className="preview-atc">Add to cart</div>

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
                                        Dispatched from {settingsData.timezone?.split("/")[1]?.replace("_", " ") || "Kolkata"}
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
                                            <span className="edd-breakdown-val">{shipShort}</span>
                                        </div>
                                        <div className="edd-breakdown-row">
                                            <span className="edd-breakdown-label">In transit</span>
                                            <span className="edd-breakdown-val">
                                                {matchedZone.transitMin ?? 2}–{matchedZone.transitMax ?? 4} days to {matchedZone.name || "domestic"}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
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
