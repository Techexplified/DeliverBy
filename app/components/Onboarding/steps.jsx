import React, { useState } from "react";
import { PublicHolidays } from "../../libs/onboarding/Holidays";

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "(GMT+5:30) Kolkata" },
  { value: "Europe/London", label: "(GMT+1:00) London" },
  { value: "America/New_York", label: "(GMT-4:00) New York" },
  { value: "America/Los_Angeles", label: "(GMT-7:00) Los Angeles" },
  { value: "Australia/Sydney", label: "(GMT+10:00) Sydney" },
];

export const COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "IE", name: "Ireland" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "OT", name: "Other" }
];

const DEFAULT_ZONES = [
  { name: "India domestic", countries: ["IN"], transitMin: 2, transitMax: 4, isHome: true, isFallback: false },
  { name: "United States", countries: ["US"], transitMin: 6, transitMax: 9, isHome: false, isFallback: false },
  { name: "Europe", countries: ["GB", "DE", "FR", "NL", "IE", "ES", "IT"], transitMin: 5, transitMax: 8, isHome: false, isFallback: false },
  { name: "Australia & New Zealand", countries: ["AU", "NZ"], transitMin: 8, transitMax: 12, isHome: false, isFallback: false },
  { name: "Rest of world", countries: [], transitMin: 12, transitMax: 24, isHome: false, isFallback: true },
];

const getCountryName = (code) => COUNTRIES.find((c) => c.code === code)?.name || code;

/* ══════════════════════════════════════════════════════════════
   STEP 1: PACKING TIME
   ══════════════════════════════════════════════════════════════ */
export function Step1({ formData, updateField }) {
  return (
    <div className="ob-card">
      <h3 className="step-title">When do you pack orders?</h3>
      <p className="step-desc">
        This is the deadline a shopper is racing against. Orders placed after it join the next working day's dispatch.
      </p>

      {/* Cutoff Time & Timezone */}
      <div className="ob-field">
        <label className="ob-label" htmlFor="cutoff">Daily cut-off</label>
        <div className="ob-inline">
          <input
            id="cutoff"
            type="time"
            className="ob-input"
            style={{ width: "130px" }}
            value={formData.cutoffTime || "14:00"}
            onChange={(e) => updateField("cutoffTime", e.target.value)}
          />
          <select
            className="ob-input"
            style={{ width: "220px" }}
            value={formData.timezone || "Asia/Kolkata"}
            onChange={(e) => updateField("timezone", e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
        <p className="ob-help">
          Orders placed before this time are packed the same day. The cut-off belongs to your warehouse clock.
        </p>
      </div>

      <div className="ob-divider" />

      {/* Processing Range */}
      <div className="ob-field">
        <label className="ob-label">How long you take to pack</label>
        <div className="ob-inline">
          <input
            type="number"
            className="ob-input ob-input-num"
            min={0}
            max={formData.procMax - 1}
            value={formData.procMin ?? 1}
            onChange={(e) => updateField("procMin", Math.max(0, parseInt(e.target.value) || 0))}
          />
          <span>to</span>
          <input
            type="number"
            className="ob-input ob-input-num"
            min={formData.procMin + 1}
            max={60}
            value={formData.procMax ?? 2}
            onChange={(e) => updateField("procMax", Math.max(0, parseInt(e.target.value) || 0))}
          />
          <span>working days after cut-off</span>
        </div>
        <p className="ob-help">
          A range is safer than a single number. One busy day won't make you miss a promise.
        </p>
      </div>

      <div className="ob-divider" />

      {/* Out of Stock Allowance */}
      <div className="ob-switch-row">
        <div className="ob-switch-text">
          <h4>Add time when something is out of stock</h4>
          <p>Products at zero inventory get extra days instead of an estimate you can't keep.</p>
          {formData.oosEnabled && (
            <div className="ob-inline" style={{ marginTop: "10px" }}>
              <span>Add</span>
              <input
                type="number"
                className="ob-input ob-input-num"
                min={1}
                max={90}
                value={formData.oosDays ?? 10}
                onChange={(e) => updateField("oosDays", Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span>extra days for restock</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`ob-switch ${formData.oosEnabled ? "active" : ""}`}
          onClick={() => updateField("oosEnabled", !formData.oosEnabled)}
          aria-label="Toggle Out of Stock buffer"
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 2: OPEN DAYS & CALENDAR
   ══════════════════════════════════════════════════════════════ */
export function Step2({ formData, updateField }) {
  const DAYS = [
    { day: 1, label: "Mon" },
    { day: 2, label: "Tue" },
    { day: 3, label: "Wed" },
    { day: 4, label: "Thu" },
    { day: 5, label: "Fri" },
    { day: 6, label: "Sat" },
    { day: 0, label: "Sun" },
  ];

  const [closureDate, setClosureDate] = useState("");
  const [closureReason, setClosureReason] = useState("");

  const importHolidays = (countrycode) => {
    const holidaysAdded = PublicHolidays(countrycode, formData);
    const closureData = formData.closures || [];
    const updated = [...closureData, ...holidaysAdded];
    updateField("closures", updated);
  };

  const toggleDay = (day) => {
    const current = formData.workingDays || [1, 2, 3, 4, 5, 6];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    updateField("workingDays", updated);
  };

  const addClosure = () => {
    if (!closureDate) return;
    const existing = formData.closures || [];
    if (existing.some((c) => c.date === closureDate)) return;
    const updated = [...existing, { date: closureDate, reason: closureReason || "Closed" }];
    updateField("closures", updated);
    setClosureDate("");
    setClosureReason("");
  };

  const removeClosure = (dateToRemove) => {
    const updated = (formData.closures || []).filter((c) => c.date !== dateToRemove);
    updateField("closures", updated);
  };


  return (
    <div className="ob-card">
      <h3 className="step-title">Which days are you open?</h3>
      <p className="step-desc">
        Dispatch is counted in working days, so non-working days and holidays are skipped automatically.
      </p>

      {/* Warehouse Working Days */}
      <div className="ob-field">
        <label className="ob-label">Days you pack and dispatch</label>
        <div className="days-grid">
          {DAYS.map((d) => {
            const isSelected = (formData.workingDays || []).includes(d.day);
            return (
              <button
                key={d.day}
                type="button"
                className={`day-btn ${isSelected ? "selected" : ""}`}
                onClick={() => toggleDay(d.day)}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <p className="ob-help">The days someone is in your warehouse packing boxes.</p>
      </div>

      <div className="ob-divider" />

      {/* Carrier Weekend Deliveries */}
      <div className="ob-field">
        <label className="ob-label">Days your carrier delivers</label>
        <div className="ob-inline" style={{ gap: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={Boolean(formData.carrierSat)}
              onChange={(e) => updateField("carrierSat", e.target.checked)}
            />
            <span>Saturday delivery</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={Boolean(formData.carrierSun)}
              onChange={(e) => updateField("carrierSun", e.target.checked)}
            />
            <span>Sunday delivery</span>
          </label>
        </div>
        <p className="ob-help">Separate from your warehouse days. Most carriers skip Sundays.</p>
      </div>

      <div className="ob-divider" />

      {/* Closures / Holidays */}
      <div className="ob-field">
        <label className="ob-label">Days you're closed (Holidays)</label>
        {formData.closures && formData.closures.length > 0 ? (
          <div className="ob-chips">
            {formData.closures.map((c) => (
              <span key={c.date} className="ob-chip">
                {c.date} ({c.reason})
                <button type="button" onClick={() => removeClosure(c.date)}>✕</button>
              </span>
            ))}
          </div>
        ) : (
          <p className="ob-help" style={{ marginBottom: "8px" }}>No closures added yet.</p>
        )}

        <div className="ob-inline" style={{ marginTop: "10px" }}>
          <input
            type="date"
            className="ob-input"
            style={{ width: "160px" }}
            min={new Date().toISOString().split("T")[0]}
            max={`${new Date().getFullYear()}-12-31`}
            value={closureDate}
            onChange={(e) => setClosureDate(e.target.value)}
          />
          <input
            type="text"
            className="ob-input"
            style={{ width: "160px" }}
            placeholder="Reason (e.g. Diwali)"
            value={closureReason}
            onChange={(e) => setClosureReason(e.target.value)}
          />
          <button type="button" className="btn btn-sm" onClick={addClosure}>
            Add
          </button>
        </div>

        {/* Public Holidays */}
        <div className="ob-inline" style={{ marginTop: "12px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "var(--text-sub)" }}>Import public holidays:</span>
          <button type="button" onClick={() => importHolidays("IN")} className="btn btn-sm">IN</button>
          <button type="button" onClick={() => importHolidays("US")} className="btn btn-sm">US</button>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 3: SHIPPING & ZONES
   ══════════════════════════════════════════════════════════════ */

export function Step3({ formData, updateField }) {
  const zones = (formData.zones && formData.zones.length >= 5) ? formData.zones : DEFAULT_ZONES;


  const handleHomeChange = (countryCode) => {
    updateField("homeCountry", countryCode);
    const updatedZones = zones.map((z) => ({
      ...z,
      isHome: z.countries?.includes(countryCode) ? true : false,
    }));
    updateField("zones", updatedZones);
  };

  const updateZoneTransit = (zoneIndex, field, val) => {
    const updated = [...zones];
    updated[zoneIndex] = {
      ...updated[zoneIndex],
      [field]: Math.max(1, parseInt(val) || 1),
    };
    updateField("zones", updated);
  };

  return (
    <div className="ob-card">
      <h3 className="step-title">How long does delivery take?</h3>
      <p className="step-desc">
        Group your countries and give each one an honest range. You can add more zones later.
      </p>

      {/* Origin Country */}
      <div className="ob-field">
        <label className="ob-label" htmlFor="homeCountry">
          Where you ship from
        </label>
        <select
          id="homeCountry"
          className="ob-input"
          style={{ maxWidth: "280px" }}
          value={formData.homeCountry || "IN"}
          onChange={(e) => handleHomeChange(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="ob-help">
          Anything crossing a border out of here gets a customs allowance added to the slow end.
        </p>
      </div>

      <div className="ob-divider" />

      {/* Transit Zones */}
      <div className="ob-field">
        <label className="ob-label" style={{ marginBottom: "12px" }}>
          How long the carrier takes
        </label>

        {zones.map((zone, idx) => {
          const isHomeZone = (zone.countries && zone.countries.includes(formData.homeCountry || "IN"));

          const countriesSubtitle = zone.isFallback
            ? "Every country you haven't listed"
            : zone.countries?.map((c) => getCountryName(c)).join(", ") || "None";

          return (
            <div key={zone.id || idx} className="zone-row">
              <div className="zone-left">
                <div className="zone-title">
                  <span>{zone.name}</span>
                  {isHomeZone && <span className="badge-home">Home</span>}
                </div>
                <div className="zone-countries">{countriesSubtitle}</div>
              </div>

              <div className="ob-inline" style={{ flexShrink: 0 }}>
                <input
                  type="number"
                  className="ob-input ob-input-num"
                  min={1}
                  max={zone.transitMax - 1}
                  value={zone.transitMin ?? 2}
                  onChange={(e) => updateZoneTransit(idx, "transitMin", e.target.value)}
                />
                <span style={{ color: "var(--text-sub)", fontSize: "12px" }}>to</span>
                <input
                  type="number"
                  className="ob-input ob-input-num"
                  min={zone.transitMin + 1}
                  max={120}
                  value={zone.transitMax ?? 4}
                  onChange={(e) => updateZoneTransit(idx, "transitMax", e.target.value)}
                />
                <span style={{ color: "var(--text-sub)", fontSize: "12px" }}>days</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Hint Callout */}
      <div className="ob-hint-box">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm1 8H7V7h2v5z" />
        </svg>
        <div>
          Guess high rather than low. You'll see what really happened on the{" "}
          <b>Delivery accuracy</b> page, and you can correct these in one click.
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 4: EXCEPTIONS (PRODUCT RULES)
   ══════════════════════════════════════════════════════════════ */
export function Step4({ formData, updateField }) {
  const rules = formData.rules || [
    {
      matchField: "type",
      matchOperator: "is",
      matchValue: "Made to order",
      behaviour: "estimate",
      procMin: 14,
      procMax: 21,
      isEnabled: true,
    },
    {
      matchField: "tag",
      matchOperator: "is",
      matchValue: "preorder",
      behaviour: "merchant",
      procMin: 0,
      procMax: 0,
      isEnabled: true,
    },
    {
      matchField: "type",
      matchOperator: "is",
      matchValue: "Digital",
      behaviour: "hide",
      procMin: 0,
      procMax: 0,
      isEnabled: true,
    },
  ];

  const toggleRule = (idx) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], isEnabled: !updated[idx].isEnabled };
    updateField("rules", updated);
  };

  const updateRuleField = (idx, field, val) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], [field]: val };
    updateField("rules", updated);
  };

  return (
    <div className="ob-card">
      <h3 className="step-title">Any products that work differently?</h3>
      <p className="step-desc">
        Most shops need none of these. Enable only the rules that describe items you actually sell.
      </p>

      {/* Rule 1: Made to order */}
      <div className={`ob-opt-card ${rules[0]?.isEnabled ? "active" : ""}`}>
        <input
          type="checkbox"
          checked={Boolean(rules[0]?.isEnabled)}
          onChange={() => toggleRule(0)}
        />
        <div className="ob-opt-content" style={{ flex: 1 }}>
          <h4>Some products are made to order</h4>
          <p>Custom manufacturing takes longer than standard in-stock inventory.</p>
          {rules[0]?.isEnabled && (
            <div className="ob-inline" style={{ marginTop: "10px" }}>
              <span>Product type is</span>
              <input
                type="text"
                className="ob-input"
                style={{ width: "150px", height: "30px" }}
                value={rules[0]?.matchValue || "Made to order"}
                onChange={(e) => updateRuleField(0, "matchValue", e.target.value)}
              />
              <span>· takes</span>
              <input
                type="number"
                className="ob-input ob-input-num"
                style={{ height: "30px" }}
                value={rules[0]?.procMin ?? 14}
                min={1}
                max={rules[0]?.procMax - 1}
                onChange={(e) => updateRuleField(0, "procMin", parseInt(e.target.value) || 0)}
              />
              <span>to</span>
              <input
                type="number"
                className="ob-input ob-input-num"
                style={{ height: "30px" }}
                value={rules[0]?.procMax ?? 21}
                min={rules[0]?.procMin + 1}
                max={365}
                onChange={(e) => updateRuleField(0, "procMax", parseInt(e.target.value) || 0)}
              />
              <span>working days</span>
            </div>
          )}
        </div>
      </div>

      {/* Rule 2: Pre-orders */}
      <div className={`ob-opt-card ${rules[1]?.isEnabled ? "active" : ""}`}>
        <input
          type="checkbox"
          checked={Boolean(rules[1]?.isEnabled)}
          onChange={() => toggleRule(1)}
        />
        <div className="ob-opt-content" style={{ flex: 1 }}>
          <h4>Some products are pre-orders</h4>
          <p>Show the date promised on the product rather than calculating an estimate.</p>
          {rules[1]?.isEnabled && (
            <div className="ob-inline" style={{ marginTop: "10px" }}>
              <span>Product tag is</span>
              <input
                type="text"
                className="ob-input"
                style={{ width: "150px", height: "30px" }}
                value={rules[1]?.matchValue || "preorder"}
                onChange={(e) => updateRuleField(1, "matchValue", e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Rule 3: Digital / No delivery */}
      <div className={`ob-opt-card ${rules[2]?.isEnabled ? "active" : ""}`}>
        <input
          type="checkbox"
          checked={Boolean(rules[2]?.isEnabled)}
          onChange={() => toggleRule(2)}
        />
        <div className="ob-opt-content" style={{ flex: 1 }}>
          <h4>Some products aren't delivered at all</h4>
          <p>Digital downloads and gift cards. The block hides itself automatically.</p>
          {rules[2]?.isEnabled && (
            <div className="ob-inline" style={{ marginTop: "10px" }}>
              <span>Product type is</span>
              <input
                type="text"
                className="ob-input"
                style={{ width: "150px", height: "30px" }}
                value={rules[2]?.matchValue || "Digital"}
                onChange={(e) => updateRuleField(2, "matchValue", e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Hint Callout */}
      <div className="ob-hint-box">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm1 8H7V7h2v5z" />
        </svg>
        <div>
          Exceptions are checked top to bottom. You can add more rules, reorder them, and check which products match on the <b>Product rules</b> page after setup.
        </div>
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 5: GO LIVE & PLACEMENT
   ══════════════════════════════════════════════════════════════ */
export function Step5({ formData, updateField, url, isEmbedded }) {
  console.log("EMbed:",isEmbedded);
  const isBlockAdded = isEmbedded;

  const handleToggleBlock = () => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const POSITIONS = [
    { value: "above-atc", label: "Above Add to cart" },
    { value: "below-atc", label: "Below Add to cart" },
    { value: "below-desc", label: "Below description" },
  ];

  return (
    <div className="ob-card">
      <h3 className="step-title">Add the block to your theme</h3>
      <p className="step-desc">
        This is the step that puts the date on your product page. Nothing shows to shoppers until it's done.
      </p>
      <div className="ob-divider" />
      {/* Single Clean App Block Row */}
      <div className="theme-row">
        <div className="theme-info">
          <h4>
            <span>Theme App Block</span>
          </h4>
          <p>
            {isBlockAdded
              ? "DeliverBy block added to your theme."
              : "Supports app blocks — one click opens the Shopify theme editor."}
          </p>
        </div>

        <div>
          <button
            type="button"
            className={`btn ${isBlockAdded ? "" : "btn-primary"}`}
            onClick={handleToggleBlock}
          >
            {isBlockAdded ? "Remove block" : "Add block"}
          </button>
        </div>
      </div>

      <div className="ob-divider" />

      {/* Where it sits on the page */}
      <div className="ob-field">
        <label className="ob-label" style={{ marginBottom: "10px" }}>
          Where it sits on the page
        </label>
        <div className="seg-control">
          {POSITIONS.map((pos) => (
            <button
              key={pos.value}
              type="button"
              className={`seg-btn ${formData.widgetPosition === pos.value ? "active" : ""}`}
              onClick={() => updateField("widgetPosition", pos.value)}
            >
              {pos.label}
            </button>
          ))}
        </div>
        <p className="ob-help" style={{ marginTop: "10px" }}>
          Below the button is where most shoppers look for it, right at the moment they hesitate.
        </p>
      </div>

      {/* Warning Banner (Shown when block is not added yet) */}
      {!isBlockAdded && (
        <div className="ob-banner-warning">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1.4l6.6 12.2H1.4L8 1.4zm0 4.2a.9.9 0 00-.9 1l.2 2.6a.7.7 0 001.4 0l.2-2.6a.9.9 0 00-.9-1zm0 5.3a.95.95 0 100 1.9.95.95 0 000-1.9z" />
          </svg>
          <div>
            <h4>Nothing shows to shoppers yet</h4>
            <p>
              You can finish setup without this, but the delivery date won't appear on your store until the block is added.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 6: SETUP COMPLETE (SUCCESS RECAP)
   ══════════════════════════════════════════════════════════════ */
export function Step6({ formData, onFinish, isEmbedded, url }) {
  const [copied, setCopied] = useState(false);

  const DAYS_SHORT = {
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
    7: "Sun",
  };

  const activeRulesCount = (formData.rules || []).filter((r) => r.isEnabled).length;
  const workingDaysText = (formData.workingDays || [1, 2, 3, 4, 5, 6])
    .map((d) => DAYS_SHORT[d])
    .filter(Boolean)
    .join(", ");

  const packingText = `${formData.procMin ?? 1}–${formData.procMax ?? 2} working days`;
  const tzLabel = TIMEZONES.find((t) => t.value === formData.timezone)?.label || formData.timezone || "(GMT+5:30) Kolkata";
  const cutoffText = `${formData.cutoffTime || "14:00"} · ${tzLabel}`;

  const homeCountryName = getCountryName(formData.homeCountry || "IN");
  const homeZone = formData.zones?.find((z) => z.isHome)?.name || "India domestic";
  const shipsFromText = `${homeCountryName} · home zone ${homeZone}`;

  const closedDaysCount = formData.closures?.length || 0;
  const zonesCount = formData.zones?.length || 5;
  const themeStatusText = isEmbedded ? "Active on live theme" : "Not added yet";

  const handleCopySettings = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(formData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="ob-card" style={{ padding: "28px 24px" }}>
      {/* Header */}
      <div className="recap-header">
        <div className="recap-icon">
          <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.8 4.2a1 1 0 010 1.4l-6.5 6.5a1 1 0 01-1.4 0L2.2 8.4a1 1 0 111.4-1.4l3 3 5.8-5.8a1 1 0 011.4 0z" />
          </svg>
        </div>
        <h2 className="recap-title">Setup saved</h2>
        <p className="recap-subtitle">
          {!isEmbedded
            ? "Your rules are saved, but shoppers won't see a date until you add the block to your theme."
            : "Your rules are saved, and delivery dates are now live on your store."}
        </p>

        {/* Add block button (shown only if not embedded yet) */}
        {!isEmbedded && (
          <div style={{ marginTop: "12px", marginBottom: "16px" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
            >
              Add the block now
            </button>
          </div>
        )}
      </div>

      {/* Summary Table */}
      <div className="recap-table">
        <div className="recap-row">
          <span className="recap-row-label">Cut-off</span>
          <span className="recap-row-value">{cutoffText}</span>
        </div>
        <div className="recap-row">
          <span className="recap-row-label">Packing</span>
          <span className="recap-row-value">{packingText}</span>
        </div>
        <div className="recap-row">
          <span className="recap-row-label">Open</span>
          <span className="recap-row-value">{workingDaysText}</span>
        </div>
        <div className="recap-row">
          <span className="recap-row-label">Closed days</span>
          <span className="recap-row-value">{closedDaysCount}</span>
        </div>
        <div className="recap-row">
          <span className="recap-row-label">Home country</span>
          <span className="recap-row-value">{homeCountryName}</span>
        </div>
        <div className="recap-row">
          <span className="recap-row-label">Zones</span>
          <span className="recap-row-value">{zonesCount}</span>
        </div>
        <div className="recap-row">
          <span className="recap-row-label">Exceptions</span>
          <span className="recap-row-value">{activeRulesCount === 0 ? "None" : `${activeRulesCount} active`}</span>
        </div>
        <div className="recap-row">
          <span className="recap-row-label">On your theme</span>
          <span className="recap-row-value">{themeStatusText}</span>
        </div>
      </div>

      {/* What to do next */}
      <div className="recap-section">
        <h3 className="recap-section-title">What to do next</h3>
        <p className="recap-section-subtitle">Two things worth doing in the first week.</p>

        <div className="next-card">
          <div className="next-card-info">
            <h4>Run the awkward cases</h4>
            <p>
              Preview & test has saved situations — ordering after the cut-off, on a closed day, out of stock, from a country you'd forgotten about.
            </p>
          </div>
          <button type="button" className="btn" onClick={onFinish}>
            Open
          </button>
        </div>

        <div className="next-card">
          <div className="next-card-info">
            <h4>Check the dates were true</h4>
            <p>
              Delivery accuracy compares what you promised against when parcels actually landed, per zone. Fix a range in one click.
            </p>
          </div>
          <button type="button" className="btn" onClick={onFinish}>
            Open
          </button>
        </div>
      </div>

      {/* Your settings JSON export */}
      <div className="recap-section">
        <h3 className="recap-section-title">Your settings</h3>
        <div style={{ marginTop: "8px" }}>
          <textarea
            className="recap-json-box"
            readOnly
            value={JSON.stringify(formData, null, 2)}
          />
        </div>
        <p className="ob-help" style={{ marginTop: "6px", marginBottom: "12px" }}>
          Paste this into the storefront demo's <b>Load settings</b> box to see your own rules on a product page.
        </p>
        <button type="button" className="btn" onClick={handleCopySettings}>
          {copied ? "Copied!" : "Copy settings"}
        </button>
      </div>

      {/* Final Go to Dashboard button */}
      <div style={{ marginTop: "32px", textAlign: "center" }}>
        <button type="button" className="btn btn-primary" style={{ height: "38px", padding: "0 24px" }} onClick={onFinish}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
