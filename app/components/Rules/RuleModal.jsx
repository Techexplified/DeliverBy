import React, { useState, useEffect } from "react";

export default function RuleModal({
  isOpen,
  editingRule,
  onClose,
  onSave,
}) {
  const [matchField, setMatchField] = useState("type");
  const [matchOperator, setMatchOperator] = useState("is");
  const [matchValue, setMatchValue] = useState("");
  const [behaviour, setBehaviour] = useState("estimate");
  const [procMin, setProcMin] = useState(1);
  const [procMax, setProcMax] = useState(2);

  useEffect(() => {
    if (editingRule) {
      setMatchField(editingRule.matchField || "type");
      setMatchOperator(editingRule.matchOperator || "is");
      setMatchValue(editingRule.matchValue || "");
      setBehaviour(editingRule.behaviour || "estimate");
      setProcMin(editingRule.procMin ?? 1);
      setProcMax(editingRule.procMax ?? 2);
    } else {
      setMatchField("type");
      setMatchOperator("is");
      setMatchValue("");
      setBehaviour("estimate");
      setProcMin(1);
      setProcMax(2);
    }
  }, [editingRule, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!matchValue.trim()) return;

    onSave({
      id: editingRule?.id || `rule-${Date.now()}`,
      priorityOrder: editingRule?.priorityOrder ?? 0,
      matchField,
      matchOperator,
      matchValue: matchValue.trim(),
      behaviour,
      procMin: behaviour === "estimate" ? Number(procMin) || 0 : 0,
      procMax: behaviour === "estimate" ? Number(procMax) || 0 : 0,
      isEnabled: editingRule?.isEnabled !== undefined ? editingRule.isEnabled : true,
    });

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h3>{editingRule ? "Edit product rule" : "Add product rule"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Section 1: When a product matches */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1a1a1a", marginBottom: "8px" }}>
              When a product matches
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "130px 110px 1fr", gap: "8px" }}>
              {/* Field */}
              <select
                className="rules-input"
                value={matchField}
                onChange={(e) => setMatchField(e.target.value)}
              >
                <option value="type">Product type</option>
                <option value="tag">Tag</option>
                <option value="title">Product title</option>
                <option value="vendor">Vendor</option>
              </select>

              {/* Operator */}
              <select
                className="rules-input"
                value={matchOperator}
                onChange={(e) => setMatchOperator(e.target.value)}
              >
                <option value="is">is exactly</option>
                <option value="contains">contains</option>
              </select>

              {/* Match Value */}
              <input
                type="text"
                className="rules-input"
                placeholder={
                  matchField === "type"
                    ? "e.g. Made to order"
                    : matchField === "tag"
                    ? "e.g. preorder"
                    : matchField === "vendor"
                    ? "e.g. Nike"
                    : "e.g. Custom"
                }
                value={matchValue}
                onChange={(e) => setMatchValue(e.target.value)}
              />
            </div>

            <p style={{ fontSize: "12px", color: "#616161", margin: "6px 0 0" }}>
              Type the value this rule should look for.
            </p>
          </div>

          {/* Section 2: Then (Segmented Control) */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1a1a1a", marginBottom: "8px" }}>
              Then
            </label>

            <div className="rules-seg-control">
              <button
                type="button"
                className={`rules-seg-btn ${behaviour === "estimate" ? "active" : ""}`}
                onClick={() => setBehaviour("estimate")}
              >
                Use custom dispatch time
              </button>
              <button
                type="button"
                className={`rules-seg-btn ${behaviour === "merchant" ? "active" : ""}`}
                onClick={() => setBehaviour("merchant")}
              >
                Show the date I set
              </button>
              <button
                type="button"
                className={`rules-seg-btn ${behaviour === "hide" ? "active" : ""}`}
                onClick={() => setBehaviour("hide")}
              >
                Hide the block
              </button>
            </div>

            {/* Behaviour Explanation & Additional Inputs */}
            {behaviour === "estimate" && (
              <div>
                <p style={{ fontSize: "12px", color: "#616161", margin: "4px 0 14px" }}>
                  Uses its own dispatch time instead of the store default.
                </p>

                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#1a1a1a", marginBottom: "6px" }}>
                  Dispatch time for these products
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    className="rules-input-num"
                    value={procMin}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      setProcMin(val);
                      if (val !== "" && procMax !== "" && Number(val) > Number(procMax)) {
                        setProcMax(val);
                      }
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "#616161" }}>to</span>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    className="rules-input-num"
                    value={procMax}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      setProcMax(val);
                      if (val !== "" && procMin !== "" && Number(val) < Number(procMin)) {
                        setProcMin(val);
                      }
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "#616161" }}>working days</span>
                </div>
                <p style={{ fontSize: "11.5px", color: "#616161", margin: "6px 0 0" }}>
                  Replaces your store default. The out-of-stock allowance is not added on top.
                </p>
              </div>
            )}

            {behaviour === "merchant" && (
              <p style={{ fontSize: "12.5px", color: "#616161", margin: "6px 0 0", lineHeight: "18px" }}>
                Shows the date set on the product itself, with no calculation. Right for pre-orders.
              </p>
            )}

            {behaviour === "hide" && (
              <p style={{ fontSize: "12.5px", color: "#616161", margin: "6px 0 0", lineHeight: "18px" }}>
                No delivery block at all — right for gift cards, downloads and services.
              </p>
            )}
          </div>
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
            disabled={!matchValue.trim()}
          >
            {editingRule ? "Save rule" : "Add rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
