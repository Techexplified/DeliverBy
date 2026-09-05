import React from "react";
import { COUNTRIES, getZoneArrivalText } from "../../routes/app.zones";

export default function ZonesTable({
  zones,
  formData,
  onUpdateZoneTransit,
  onOpenAddModal,
  onOpenEditModal,
  onRemoveZone,
}) {
  const getCountryNames = (codes) => {
    if (!codes || codes.length === 0) return "—";
    return codes
      .map((code) => COUNTRIES.find((c) => c.code === code)?.name || code)
      .join(", ");
  };

  const totalNamedCountries = (zones || [])
    .filter((z) => !z.isFallback)
    .reduce((sum, z) => sum + (z.countries?.length || 0), 0);

  return (
    <div className="zones-section">
      <h2 className="zones-section-title">Transit times</h2>
      <p className="zones-section-subtitle">
        Days in the carrier's hands, counted from dispatch. Countries you haven't listed fall through
        to the catch-all zone.
      </p>

      <div className="zones-card">
        <div className="zones-card-header">
          <h3 className="zones-card-title">Zones</h3>
          <button type="button" className="btn" onClick={onOpenAddModal}>
            Add zone
          </button>
        </div>

        <table className="zones-table">
          <thead>
            <tr>
              <th style={{ width: "24%" }}>Zone</th>
              <th style={{ width: "32%" }}>Countries</th>
              <th style={{ width: "16%" }}>Transit days</th>
              <th style={{ width: "16%" }}>Shoppers arrive</th>
              <th style={{ width: "12%", textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            {(zones || []).map((z, idx) => (
              <tr key={z.id || idx}>
                {/* Zone Name & Badges */}
                <td>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                    <strong style={{ color: "#1a1a1a" }}>{z.name}</strong>
                    {z.isHome && <span className="badge-home">Home</span>}
                    {z.isFallback && <span className="badge-catchall">Catch-all</span>}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#616161", marginTop: "2px" }}>
                    {z.isFallback
                      ? "Everywhere you haven't listed above"
                      : `${z.countries?.length || 0} ${
                          z.countries?.length === 1 ? "country" : "countries"
                        }`}
                  </div>
                </td>

                {/* Countries list */}
                <td style={{ color: z.isFallback ? "#8A8A8A" : "#303030", fontSize: "12.5px" }}>
                  {z.isFallback ? "—" : getCountryNames(z.countries)}
                </td>

                {/* Transit Days inline inputs */}
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="number"
                      min="0"
                      max={z.transitMax}
                      className="zones-input-num"
                      value={z.transitMin}
                      onChange={(e) =>
                        onUpdateZoneTransit(
                          idx,
                          "transitMin",
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                    <span style={{ color: "#8A8A8A" }}>–</span>
                    <input
                      type="number"
                      min={z.transitMin}
                      max="60"
                      className="zones-input-num"
                      value={z.transitMax}
                      onChange={(e) =>
                        onUpdateZoneTransit(
                          idx,
                          "transitMax",
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                  </div>
                </td>

                {/* Shoppers arrive */}
                <td style={{ color: "#303030", fontWeight: 500 }}>
                  {getZoneArrivalText(z, formData)}
                </td>

                {/* Actions */}
                <td>
                  <div className="zones-row-actions">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onOpenEditModal(z, idx)}
                    >
                      Edit
                    </button>
                    {!z.isFallback && (
                      <button
                        type="button"
                        className="zones-remove-btn"
                        onClick={() => onRemoveZone(idx)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: "12px", color: "#616161", margin: "4px 0 0" }}>
          {totalNamedCountries} countries named directly, everywhere else uses the catch-all zone.
        </p>
      </div>
    </div>
  );
}
