import React from "react";

export default function WordingCard({
  mainLine,
  supportingLine,
  fallbackText,
  onUpdateField,
}) {
  const handleInsertToken = (field, currentVal, token) => {
    const newVal = currentVal ? `${currentVal} ${token}` : token;
    onUpdateField(field, newVal);
  };

  return (
    <div className="wd-card">
      <h3 className="wd-card-title">Wording</h3>
      <p className="wd-card-subtitle">
        Click a token to insert the calculated value into the line you're editing.
      </p>

      {/* Main Line */}
      <div style={{ marginBottom: "16px" }}>
        <label className="wd-label">Main line</label>
        <input
          type="text"
          className="wd-input"
          value={mainLine}
          onChange={(e) => onUpdateField("mainLine", e.target.value)}
          placeholder="Get it {date}"
        />
        <div className="token-chips-row">
          <button
            type="button"
            className="token-chip-btn"
            onClick={() => handleInsertToken("mainLine", mainLine, "{date}")}
          >
            &#123;date&#125;
          </button>
          <button
            type="button"
            className="token-chip-btn"
            onClick={() => handleInsertToken("mainLine", mainLine, "{days}")}
          >
            &#123;days&#125;
          </button>
          <button
            type="button"
            className="token-chip-btn"
            onClick={() => handleInsertToken("mainLine", mainLine, "{zone}")}
          >
            &#123;zone&#125;
          </button>
        </div>
      </div>

      {/* Supporting Line */}
      <div style={{ marginBottom: "16px" }}>
        <label className="wd-label">Supporting line</label>
        <input
          type="text"
          className="wd-input"
          value={supportingLine}
          onChange={(e) => onUpdateField("supportingLine", e.target.value)}
          placeholder="Dispatched from Kolkata"
        />
        <div className="token-chips-row">
          <button
            type="button"
            className="token-chip-btn"
            onClick={() => handleInsertToken("supportingLine", supportingLine, "{date}")}
          >
            &#123;date&#125;
          </button>
          <button
            type="button"
            className="token-chip-btn"
            onClick={() => handleInsertToken("supportingLine", supportingLine, "{days}")}
          >
            &#123;days&#125;
          </button>
          <button
            type="button"
            className="token-chip-btn"
            onClick={() => handleInsertToken("supportingLine", supportingLine, "{zone}")}
          >
            &#123;zone&#125;
          </button>
        </div>
      </div>

      {/* Fallback Text for Geolocation Failure */}
      <div>
        <label className="wd-label">When you can't tell where the shopper is</label>
        <input
          type="text"
          className="wd-input"
          value={fallbackText}
          onChange={(e) => onUpdateField("fallbackText", e.target.value)}
          placeholder="Enter your postcode for a delivery date"
        />
        <p style={{ fontSize: "12px", color: "#616161", margin: "4px 0 0" }}>
          Shown when geolocation fails — a VPN, privacy mode, or a bot.
        </p>
      </div>
    </div>
  );
}
