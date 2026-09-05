import React from "react";

export default function SafetyBuffersCard({
  customsClearanceEnabled,
  customsClearanceDays,
  peakSeasonoEnabled,
  peakSeasonStart,
  peakSeasonEnd,
  peakSeasonTransitMin,
  peakSeasonTransitMax,
  onUpdateField,
}) {
  return (
    <div className="zones-section">
      <h2 className="zones-section-title">Safety buffers</h2>
      <p className="zones-section-subtitle">
        Extra days added on top of transit for conditions you can predict but not control.
      </p>

      <div className="zones-card">
        {/* Subsection 1: Customs Clearance */}
        <div className="zones-switch-row">
          <div className="zones-switch-info">
            <h4>Customs clearance</h4>
            <p>Applied to every zone outside your home country, on the slow end of the range only.</p>
          </div>
          <button
            type="button"
            className={`zones-switch ${customsClearanceEnabled ? "active" : ""}`}
            onClick={() =>
              onUpdateField("customsClearanceEnabled", !customsClearanceEnabled)
            }
            aria-label="Toggle Customs clearance buffer"
          />
        </div>

        {customsClearanceEnabled && (
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "#303030" }}>Add</span>
            <input
              type="number"
              min="1"
              max="30"
              className="zones-input-num"
              value={customsClearanceDays}
              onChange={(e) =>
                onUpdateField(
                  "customsClearanceDays",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
            <span style={{ fontSize: "13px", color: "#303030" }}>
              days to the slowest estimate
            </span>
          </div>
        )}

        <div className="zones-divider" />

        {/* Subsection 2: Peak Season */}
        <div className="zones-switch-row">
          <div className="zones-switch-info">
            <h4>Peak season</h4>
            <p>Widens the whole range during your busiest weeks, when carrier networks slow down.</p>
          </div>
          <button
            type="button"
            className={`zones-switch ${peakSeasonoEnabled ? "active" : ""}`}
            onClick={() => onUpdateField("peakSeasonoEnabled", !peakSeasonoEnabled)}
            aria-label="Toggle Peak season buffer"
          />
        </div>

        {peakSeasonoEnabled && (
          <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Start & End Dates */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>
                  Starts
                </label>
                <input
                  type="date"
                  className="zones-input-text"
                  max={peakSeasonEnd}
                  value={peakSeasonStart || ""}
                  onChange={(e) => onUpdateField("peakSeasonStart", e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>
                  Ends
                </label>
                <input
                  type="date"
                  className="zones-input-text"
                  min={peakSeasonStart}
                  value={peakSeasonEnd || ""}
                  onChange={(e) => onUpdateField("peakSeasonEnd", e.target.value)}
                />
              </div>
            </div>

            {/* Extra transit range during peak */}
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#1a1a1a", marginBottom: "6px" }}>
                Extra transit days during peak
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  min="0"
                  max={peakSeasonTransitMax}
                  className="zones-input-num"
                  value={peakSeasonTransitMin}
                  onChange={(e) =>
                    onUpdateField(
                      "peakSeasonTransitMin",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
                <span style={{ fontSize: "13px", color: "#616161" }}>to</span>
                <input
                  type="number"
                  min={peakSeasonTransitMin}
                  max="30"
                  className="zones-input-num"
                  value={peakSeasonTransitMax}
                  onChange={(e) =>
                    onUpdateField(
                      "peakSeasonTransitMax",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
                <span style={{ fontSize: "13px", color: "#616161" }}>days</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
