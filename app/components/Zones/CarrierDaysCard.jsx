import React from "react";

export default function CarrierDaysCard({ carrierSat, carrierSun, onUpdateField }) {
  return (
    <div className="zones-section">
      <h2 className="zones-section-title">Carrier working days</h2>
      <p className="zones-section-subtitle">
        Transit is counted on the carrier's calendar, not yours. A Friday dispatch with no weekend
        delivery lands on Monday at the earliest.
      </p>

      <div className="zones-card">
        {/* Saturdays */}
        <div className="zones-switch-row">
          <div className="zones-switch-info">
            <h4>Carrier delivers on Saturdays</h4>
            <p>Common for domestic express services, rare for economy.</p>
          </div>
          <button
            type="button"
            className={`zones-switch ${carrierSat ? "active" : ""}`}
            onClick={() => onUpdateField("carrierSat", !carrierSat)}
            aria-label="Toggle Carrier Saturday delivery"
          />
        </div>

        <div className="zones-divider" />

        {/* Sundays */}
        <div className="zones-switch-row">
          <div className="zones-switch-info">
            <h4>Carrier delivers on Sundays</h4>
            <p>Leave off unless your carrier contract explicitly covers it.</p>
          </div>
          <button
            type="button"
            className={`zones-switch ${carrierSun ? "active" : ""}`}
            onClick={() => onUpdateField("carrierSun", !carrierSun)}
            aria-label="Toggle Carrier Sunday delivery"
          />
        </div>
      </div>
    </div>
  );
}
