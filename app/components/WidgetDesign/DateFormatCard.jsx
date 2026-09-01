import React from "react";
import { format } from "date-fns";

export default function DateFormatCard({
  dateFormat,
  dateStyle,
  onUpdateField,
}) {
  const now = new Date();
  const fullLabel = format(now, "EEEE, d MMMM");
  const mediumLabel = format(now, "EEE d MMM");
  const shortLabel = format(now, "dd/MM");

  const getFormatSubtitle = () => {
    switch (dateFormat) {
      case "single":
        return "Riskier. A single date reads as a guarantee, and one slow parcel becomes a support ticket.";
      case "days":
        return "Vaguer, but very hard to get wrong. Good when your dispatch times move around.";
      case "range":
      default:
        return "Recommended. Wide enough to survive a slow day, tight enough to reassure.";
    }
  };

  return (
    <div className="wd-card">
      <h3 className="wd-card-title">How the date is written</h3>
      <p className="wd-card-subtitle">
        A date you can keep is worth more than a date that sounds fast.
      </p>

      {/* Date Format Segmented Control */}
      <div style={{ marginBottom: "16px" }}>
        <label className="wd-label">Date format</label>
        <div className="wd-seg-control">
          <button
            type="button"
            className={`wd-seg-btn ${dateFormat === "range" ? "active" : ""}`}
            onClick={() => onUpdateField("dateFormat", "range")}
          >
            Date range
          </button>
          <button
            type="button"
            className={`wd-seg-btn ${dateFormat === "single" ? "active" : ""}`}
            onClick={() => onUpdateField("dateFormat", "single")}
          >
            Single date
          </button>
          <button
            type="button"
            className={`wd-seg-btn ${dateFormat === "days" ? "active" : ""}`}
            onClick={() => onUpdateField("dateFormat", "days")}
          >
            Days from now
          </button>
        </div>
        <p style={{ fontSize: "12px", color: "#616161", margin: "4px 0 0" }}>
          {getFormatSubtitle()}
        </p>
      </div>

      {/* Date Style Dropdown (Only relevant when not 'days') */}
      {dateFormat !== "days" && (
        <div>
          <label className="wd-label">Date style</label>
          <select
            className="wd-input"
            value={dateStyle}
            onChange={(e) => onUpdateField("dateStyle", e.target.value)}
          >
            <option value="full">{fullLabel}</option>
            <option value="medium">{mediumLabel}</option>
            <option value="short">{shortLabel}</option>
          </select>
        </div>
      )}
    </div>
  );
}
