import React from "react";

export const ACCENT_COLORS = [
  { hex: "#1A5D38", name: "Forest Green" },
  { hex: "#303030", name: "Charcoal" },
  { hex: "#0E6493", name: "Ocean Blue" },
  { hex: "#5C6AC4", name: "Indigo" },
  { hex: "#8C2B1D", name: "Crimson" },
  { hex: "#604D1B", name: "Olive Bronze" },
];

export default function AppearanceCard({
  widgetContainer,
  widgetAlignment,
  widgetIcon,
  widgetAccentColor,
  onUpdateField,
}) {
  return (
    <div className="wd-card">
      <h3 className="wd-card-title">Appearance</h3>
      <p className="wd-card-subtitle">
        Keep it close to your theme. The block inherits your theme's font.
      </p>

      {/* Container Style */}
      <div style={{ marginBottom: "16px" }}>
        <label className="wd-label">Container</label>
        <div className="wd-seg-control">
          <button
            type="button"
            className={`wd-seg-btn ${widgetContainer === "none" ? "active" : ""}`}
            onClick={() => onUpdateField("widgetContainer", "none")}
          >
            No border
          </button>
          <button
            type="button"
            className={`wd-seg-btn ${widgetContainer === "bordered" ? "active" : ""}`}
            onClick={() => onUpdateField("widgetContainer", "bordered")}
          >
            Bordered
          </button>
          <button
            type="button"
            className={`wd-seg-btn ${widgetContainer === "tinted" ? "active" : ""}`}
            onClick={() => onUpdateField("widgetContainer", "tinted")}
          >
            Tinted
          </button>
        </div>
      </div>

      {/* Alignment */}
      <div style={{ marginBottom: "16px" }}>
        <label className="wd-label">Alignment</label>
        <div className="wd-seg-control" style={{ maxWidth: "200px" }}>
          <button
            type="button"
            className={`wd-seg-btn ${widgetAlignment === "left" ? "active" : ""}`}
            onClick={() => onUpdateField("widgetAlignment", "left")}
          >
            Left
          </button>
          <button
            type="button"
            className={`wd-seg-btn ${widgetAlignment === "center" ? "active" : ""}`}
            onClick={() => onUpdateField("widgetAlignment", "center")}
          >
            Centred
          </button>
        </div>
      </div>

      {/* Icon Type */}
      <div style={{ marginBottom: "16px" }}>
        <label className="wd-label">Icon</label>
        <div className="wd-seg-control" style={{ maxWidth: "260px" }}>
          <button
            type="button"
            className={`wd-seg-btn ${widgetIcon === "van" ? "active" : ""}`}
            onClick={() => onUpdateField("widgetIcon", "van")}
          >
            Van
          </button>
          <button
            type="button"
            className={`wd-seg-btn ${widgetIcon === "box" ? "active" : ""}`}
            onClick={() => onUpdateField("widgetIcon", "box")}
          >
            Box
          </button>
          <button
            type="button"
            className={`wd-seg-btn ${widgetIcon === "calendar" ? "active" : ""}`}
            onClick={() => onUpdateField("widgetIcon", "calendar")}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <label className="wd-label">Accent colour</label>
        <div className="swatches-row">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              className={`swatch-btn ${widgetAccentColor?.toUpperCase() === c.hex.toUpperCase() ? "active" : ""}`}
              style={{ backgroundColor: c.hex }}
              onClick={() => onUpdateField("widgetAccentColor", c.hex)}
              aria-label={c.name}
              title={c.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
