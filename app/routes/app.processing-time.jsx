import React, { useState, useEffect } from "react";
import { data, useFetcher, useLoaderData, Link } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { TIMEZONES } from "../components/Onboarding/steps";
import "../styles/processing-time.css";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shopName = session.shop;

  const shopData = await db.shop.findUnique({
    where: { shop: shopName },
  });

  return data({ shopData });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shopName = session.shop;
  const payload = await request.json();
  const { intent, shopData } = payload;

  if (intent === "save" && shopData) {
    await db.shop.update({
      where: { shop: shopName },
      data: {
        cutoffTime: shopData.cutoffTime,
        timezone: shopData.timezone,
        procMin: Number(shopData.procMin),
        procMax: Number(shopData.procMax),
        oosEnabled: Boolean(shopData.oosEnabled),
        oosDays: Number(shopData.oosDays),
      },
    });
    return data({ success: true });
  }

  return data({ error: "Invalid payload" });
}

export default function ProcessingTime() {
  const { shopData } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [formData, setFormData] = useState({
    cutoffTime: shopData.cutoffTime || "14:00",
    timezone: shopData.timezone || "Asia/Kolkata",
    procMin: shopData.procMin ?? 1,
    procMax: shopData.procMax ?? 2,
    oosEnabled: Boolean(shopData.oosEnabled),
    oosDays: shopData.oosDays ?? 10,
  });

  const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Saved");
    }
  }, [fetcher.data, shopify]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const payload = { intent: "save", shopData: formData };
    fetcher.submit(payload, {
      method: "POST",
      encType: "application/json",
    });
  };

  return (
    <div className="proc-page">
      {/* Page Header */}
      <div className="proc-header">
        <div>
          <h1 className="proc-title">Processing time</h1>
          <p className="proc-subtitle">
            How long an order sits with you before the carrier takes it.
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

      {/* Section 1: Daily cut-off */}
      <div className="proc-section">
        <h2 className="proc-section-title">Daily cut-off</h2>
        <p className="proc-section-subtitle">
          The moment your team stops adding orders to today's dispatch.
        </p>

        <div className="proc-card">
          <div className="proc-grid-2">
            {/* Cut-off time */}
            <div className="proc-field-group">
              <label className="proc-label">Cut-off time</label>
              <input
                type="time"
                className="proc-input"
                value={formData.cutoffTime}
                onChange={(e) => updateField("cutoffTime", e.target.value)}
              />
              <p className="proc-help">
                Orders placed after this go into the next working day's dispatch.
              </p>
            </div>

            {/* Store timezone */}
            <div className="proc-field-group">
              <label className="proc-label">Store timezone</label>
              <select
                className="proc-input"
                value={formData.timezone}
                onChange={(e) => updateField("timezone", e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <p className="proc-help">
                The cut-off is judged in store time. Shoppers see the countdown on their own clock.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Dispatch time */}
      <div className="proc-section">
        <h2 className="proc-section-title">Dispatch time</h2>
        <p className="proc-section-subtitle">
          Working days between a paid order and the parcel leaving your warehouse.
        </p>

        <div className="proc-card">
          {/* Store default */}
          <div>
            <label className="proc-label">Store default</label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <input
                type="number"
                min="0"
                max="60"
                className="proc-input-num"
                value={formData.procMin}
                onChange={(e) => updateField("procMin", e.target.value === "" ? "" : Number(e.target.value))}
              />
              <span style={{ fontSize: "13px", color: "#616161" }}>to</span>
              <input
                type="number"
                min="0"
                max="60"
                className="proc-input-num"
                value={formData.procMax}
                onChange={(e) => updateField("procMax", e.target.value === "" ? "" : Number(e.target.value))}
              />
              <span style={{ fontSize: "13px", color: "#616161" }}>working days</span>
            </div>
            <p className="proc-help" style={{ marginTop: "6px" }}>
              Used for every product without its own rule.{" "}
              <Link to="/app/rules" style={{ color: "#005BD3", textDecoration: "none", fontWeight: 600 }}>
                Manage product rules
              </Link>
            </p>
          </div>

          <div className="proc-divider" />

          {/* Add time when stock runs out */}
          <div className="proc-switch-row">
            <div className="proc-switch-info">
              <h4>Add time when stock runs out</h4>
              <p>
                Inventory is read live from Shopify. When a product hits zero and is still purchasable, this is added to both ends of dispatch.
              </p>
            </div>
            <button
              type="button"
              className={`proc-switch ${formData.oosEnabled ? "active" : ""}`}
              onClick={() => updateField("oosEnabled", !formData.oosEnabled)}
              aria-label="Toggle Out of Stock processing time"
            />
          </div>

          {/* Restock allowance */}
          {formData.oosEnabled && (
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #ECECEC" }}>
              <label className="proc-label">Restock allowance</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                <input
                  type="number"
                  min="0"
                  max="180"
                  className="proc-input-num"
                  value={formData.oosDays}
                  onChange={(e) => updateField("oosDays", e.target.value === "" ? "" : Number(e.target.value))}
                />
                <span style={{ fontSize: "13px", color: "#616161" }}>extra days</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
