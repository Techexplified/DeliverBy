import React, { useState, useEffect } from "react";
import { COUNTRIES } from "../../routes/app.zones";

export default function ZoneModal({
  isOpen,
  editingZone,
  existingZones,
  onClose,
  onSave,
}) {
  const [name, setName] = useState("");
  const [transitMin, setTransitMin] = useState(2);
  const [transitMax, setTransitMax] = useState(4);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [isHome, setIsHome] = useState(false);

  useEffect(() => {
    if (editingZone) {
      setName(editingZone.name || "");
      setTransitMin(editingZone.transitMin ?? 2);
      setTransitMax(editingZone.transitMax ?? 4);
      setSelectedCountries(editingZone.countries || []);
      setIsHome(Boolean(editingZone.isHome));
    } else {
      setName("");
      setTransitMin(2);
      setTransitMax(4);
      setSelectedCountries([]);
      setIsHome(false);
    }
  }, [editingZone, isOpen]);

  if (!isOpen) return null;

  const toggleCountry = (code) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      id: editingZone?.id || `zone-${Date.now()}`,
      name: name.trim(),
      transitMin: Number(transitMin) || 1,
      transitMax: Number(transitMax) || 2,
      countries: selectedCountries,
      isHome: isHome,
      isFallback: Boolean(editingZone?.isFallback),
    });

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h3>{editingZone ? "Edit delivery zone" : "Add delivery zone"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Zone Name */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1a1a1a", marginBottom: "6px" }}>
              Zone name
            </label>
            <input
              type="text"
              className="zones-input-text"
              placeholder="e.g. Gulf states"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Transit Time from Dispatch */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1a1a1a", marginBottom: "6px" }}>
              Transit time from dispatch
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="number"
                min="0"
                max="60"
                className="zones-input-num"
                value={transitMin}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  setTransitMin(val);
                  if (val !== "" && transitMax !== "" && Number(val) > Number(transitMax)) {
                    setTransitMax(val);
                  }
                }}
              />
              <span style={{ fontSize: "13px", color: "#616161" }}>to</span>
              <input
                type="number"
                min="0"
                max="60"
                className="zones-input-num"
                value={transitMax}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  setTransitMax(val);
                  if (val !== "" && transitMin !== "" && Number(val) < Number(transitMin)) {
                    setTransitMin(val);
                  }
                }}
              />
              <span style={{ fontSize: "13px", color: "#616161" }}>
                days on the carrier's calendar
              </span>
            </div>
            {transitMin !== "" && transitMax !== "" && Number(transitMin) > Number(transitMax) && (
              <p style={{ color: "#C5280C", fontSize: "11.5px", margin: "4px 0 0" }}>
                Minimum transit days cannot exceed maximum transit days.
              </p>
            )}
          </div>

          {/* Countries Checklist */}
          {!editingZone?.isFallback && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1a1a1a", marginBottom: "2px" }}>
                Countries
              </label>

              <div className="country-checklist">
                {COUNTRIES.map((c) => {
                  // Check if country is assigned to another zone
                  const otherZone = (existingZones || []).find(
                    (z) => z.id !== editingZone?.id && z.countries?.includes(c.code)
                  );

                  const isChecked = selectedCountries.includes(c.code);
                  const isDisabled = Boolean(otherZone);

                  return (
                    <label
                      key={c.code}
                      className={`country-check-item ${isDisabled ? "disabled" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => !isDisabled && toggleCountry(c.code)}
                      />
                      <span>
                        {c.name}
                        {isDisabled && (
                          <span style={{ color: "#8A8A8A", fontSize: "11.5px" }}>
                            {" "}
                            — already in {otherZone.name}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>

              <p style={{ fontSize: "11.5px", color: "#616161", margin: "6px 0 0" }}>
                A country can only belong to one zone.
              </p>
            </div>
          )}

          {/* Home country toggle */}
          {!editingZone?.isFallback && (
            <div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: "3px" }}
                  checked={isHome}
                  onChange={(e) => setIsHome(e.target.checked)}
                />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>
                    This is my home country
                  </div>
                  <div style={{ fontSize: "12px", color: "#616161" }}>
                    Home zones skip the customs buffer.
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={
              !name.trim() ||
              (!editingZone?.isFallback && selectedCountries.length === 0) ||
              Number(transitMin) > Number(transitMax)
            }
          >
            {editingZone ? "Save zone" : "Add zone"}
          </button>
        </div>
      </div>
    </div>
  );
}
