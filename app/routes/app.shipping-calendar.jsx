import React, { useState, useEffect } from "react";
import { data, useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { PublicHolidays } from "../libs/onboarding/Holidays";
import { COUNTRIES } from "../components/Onboarding/steps";
import "../styles/shipping-calendar.css";
import { HOLIDAYS } from "../libs/onboarding/Holidays";

const DAYS = [
    { id: 1, label: "Mon" },
    { id: 2, label: "Tue" },
    { id: 3, label: "Wed" },
    { id: 4, label: "Thu" },
    { id: 5, label: "Fri" },
    { id: 6, label: "Sat" },
    { id: 7, label: "Sun" },
];

export async function loader({ request }) {
    const { session } = await authenticate.admin(request);
    const shopName = session.shop;

    const shopData = await db.shop.findUnique({
        where: { shop: shopName },
        include: {
            closures: {
                orderBy: { date: "asc" },
            },
        },
    });

    return data({ shopData });
}

export async function action({ request }) {
    const { session } = await authenticate.admin(request);
    const shopName = session.shop;
    const payload = await request.json();
    const { intent, workingDays, closures } = payload;

    if (intent === "save") {
        await db.$transaction(async (tx) => {
            const shop = await tx.shop.findUnique({
                where: { shop: shopName },
                select: { id: true },
            });

            if (!shop) return;

            // 1. Update working days
            await tx.shop.update({
                where: { id: shop.id },
                data: {
                    workingDays: (workingDays || []).map(Number),
                },
            });

            // 2. Sync closures
            await tx.closure.deleteMany({
                where: { shopId: shop.id },
            });

            if (closures && closures.length > 0) {
                await tx.closure.createMany({
                    data: closures.map((c) => ({
                        shopId: shop.id,
                        date: c.date,
                        reason: c.reason,
                    })),
                });
            }
        });

        return data({ success: true });
    }

    return data({ error: "Invalid payload" });
}

export default function ShippingCalendar() {
    const { shopData } = useLoaderData();
    const fetcher = useFetcher();
    const shopify = useAppBridge();

    const [formData, setFormData] = useState({
        workingDays: shopData?.workingDays || [1, 2, 3, 4, 5, 6],
        closures: shopData?.closures || [],
    });

    const [newDate, setNewDate] = useState("");
    const [newReason, setNewReason] = useState("");
    const [importCountry, setImportCountry] = useState(shopData?.homeCountry || "IN");

    const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";

    const CountryWithHolidays = COUNTRIES.filter(
        (country) => HOLIDAYS[country.code]
    );

    useEffect(() => {
        if (fetcher.data?.success) {
            shopify.toast.show("Saved");
        }
    }, [fetcher.data, shopify]);

    // Working Days Toggle
    const toggleDay = (dayId) => {
        setFormData((prev) => {
            const exists = prev.workingDays.includes(dayId);
            const updated = exists
                ? prev.workingDays.filter((d) => d !== dayId)
                : [...prev.workingDays, dayId].sort((a, b) => a - b);
            return { ...prev, workingDays: updated };
        });
    };

    const handleAddClosure = () => {
        if (!newDate || !newReason.trim()) return;
        if (formData.closures.some((c) => c.date === newDate)) {
            shopify.toast.show("A closure already exists on this date");
            return;
        }

        setFormData((prev) => ({
            ...prev,
            closures: [...prev.closures, { date: newDate, reason: newReason.trim() }].sort((a, b) =>
                a.date.localeCompare(b.date)
            ),
        }));

        setNewDate("");
        setNewReason("");
    };

    const handleRemoveClosure = (dateToRemove) => {
        setFormData((prev) => ({
            ...prev,
            closures: prev.closures.filter((c) => c.date !== dateToRemove),
        }));
    };

    const handleImportHolidays = () => {
        const holidays = PublicHolidays(importCountry, formData);
        if (!holidays || holidays.length === 0) {
            shopify.toast.show("No new upcoming holidays to add");
            return;
        }

        setFormData((prev) => ({
            ...prev,
            closures: [...prev.closures, ...holidays].sort((a, b) =>
                a.date.localeCompare(b.date)
            ),
        }));

        shopify.toast.show(`Added ${holidays.length} public holidays`);
    };

    const handleSave = () => {
        fetcher.submit(
            {
                intent: "save",
                workingDays: formData.workingDays,
                closures: formData.closures,
            },
            {
                method: "POST",
                encType: "application/json",
            }
        );
    };

    // Summary Text
    const openDayLabels = DAYS.filter((d) => formData.workingDays.includes(d.id)).map((d) => d.label);
    const closedCount = 7 - formData.workingDays.length;
    const summaryText =
        openDayLabels.length === 7
            ? "Open 7 days a week."
            : openDayLabels.length === 0
                ? "Closed all days."
                : `Open ${openDayLabels.join(", ")}. Closed ${closedCount} day${closedCount > 1 ? "s" : ""} a week.`;

    // Date Constraints for Picker
    const today = new Date();
    const currentYear = today.getFullYear();
    const todayStr = today.toISOString().split("T")[0];
    const dec31Str = `${currentYear}-12-31`;

    // Calculate Away Text
    const getAwayText = (dateStr) => {
        try {
            const target = parseISO(dateStr);
            const diff = differenceInCalendarDays(target, today);
            if (diff === 0) return "today";
            if (diff === 1) return "tomorrow";
            if (diff > 1) return `in ${diff}d`;
            return "past";
        } catch {
            return "";
        }
    };

    return (
        <div className="cal-page">
            {/* Page Header */}
            <div className="cal-header">
                <div>
                    <h1 className="cal-title">Shipping calendar</h1>
                    <p className="cal-subtitle">
                        The days you're open, and the days you're not. Both dispatch and transit skip whatever is closed.
                    </p>
                </div>

                <div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>

            {/* Section 1: Working days */}
            <div className="cal-section">
                <h2 className="cal-section-title">Working days</h2>
                <p className="cal-section-subtitle">
                    Days your warehouse actually picks and packs. Dispatch counting skips everything switched off.
                </p>

                <div className="cal-card">
                    <div className="cal-days-grid">
                        {DAYS.map((d) => {
                            const isSelected = formData.workingDays.includes(d.id);
                            return (
                                <button
                                    key={d.id}
                                    type="button"
                                    className={`cal-day-btn ${isSelected ? "selected" : ""}`}
                                    onClick={() => toggleDay(d.id)}
                                >
                                    {d.label}
                                </button>
                            );
                        })}
                    </div>

                    <p className="cal-summary-text">{summaryText}</p>
                </div>
            </div>

            {/* Section 2: Closures */}
            <div className="cal-section">
                <h2 className="cal-section-title">Closures</h2>
                <p className="cal-section-subtitle">
                    Holidays and shutdowns. These are skipped by dispatch counting, and by transit counting too — the carrier is usually closed on the same public holidays.
                </p>

                <div className="cal-card">
                    {/* Add Closure Row */}
                    <div className="cal-add-row">
                        <input
                            type="date"
                            className="cal-input"
                            style={{ width: "150px" }}
                            min={todayStr}
                            max={dec31Str}
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                        />
                        <input
                            type="text"
                            className="cal-input"
                            style={{ flex: 1 }}
                            placeholder="Reason, e.g. Diwali"
                            value={newReason}
                            onChange={(e) => setNewReason(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddClosure()}
                        />
                        <button
                            type="button"
                            className="btn"
                            onClick={handleAddClosure}
                            disabled={!newDate || !newReason.trim()}
                        >
                            Add closure
                        </button>
                    </div>

                    {/* Closures Table */}
                    {formData.closures.length > 0 ? (
                        <table className="cal-table">
                            <thead>
                                <tr>
                                    <th style={{ width: "130px" }}>Date</th>
                                    <th>Reason</th>
                                    <th style={{ width: "90px" }}>Away</th>
                                    <th style={{ width: "70px", textAlign: "right" }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.closures.map((c) => (
                                    <tr key={c.date}>
                                        <td>
                                            {(() => {
                                                try {
                                                    return format(parseISO(c.date), "EEE d MMM");
                                                } catch {
                                                    return c.date;
                                                }
                                            })()}
                                        </td>
                                        <td>
                                            <b>{c.reason}</b>
                                        </td>
                                        <td style={{ color: "#616161" }}>{getAwayText(c.date)}</td>
                                        <td style={{ textAlign: "right" }}>
                                            <button
                                                type="button"
                                                className="cal-remove-btn"
                                                onClick={() => handleRemoveClosure(c.date)}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={{ color: "#8A8A8A", fontSize: "12.5px", margin: "10px 0 16px" }}>
                            No custom closures added yet.
                        </p>
                    )}

                    {/* Bulk Import Footer */}
                    <div className="cal-bulk-row">
                        <span className="cal-bulk-text">Bulk add a country's public holidays</span>

                        <div className="cal-bulk-controls">
                            <select
                                className="cal-input"
                                style={{ width: "160px" }}
                                value={importCountry}
                                onChange={(e) => setImportCountry(e.target.value)}
                            >
                                {CountryWithHolidays.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                className="btn"
                                onClick={handleImportHolidays}
                            >
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
