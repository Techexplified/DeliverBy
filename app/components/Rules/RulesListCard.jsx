import React from "react";
import { doesProductMatchRule } from "../../routes/app.rules";

export default function RulesListCard({
  rules,
  products,
  storeProcMin,
  storeProcMax,
  onOpenAddModal,
  onOpenEditModal,
  onRemoveRule,
  onToggleRuleStatus,
  onReorderRule,
}) {
  const activeCount = (rules || []).filter((r) => r.isEnabled).length;
  const totalCount = (rules || []).length;

  const getMatchCount = (rule) => {
    return (products || []).filter((p) => doesProductMatchRule(p, rule)).length;
  };

  const getBehaviourBadge = (rule) => {
    if (rule.behaviour === "estimate") {
      return (
        <span className="badge-blue">
          {rule.procMin}–{rule.procMax} working days
        </span>
      );
    }
    if (rule.behaviour === "merchant") {
      return <span className="badge-orange">Your own date</span>;
    }
    if (rule.behaviour === "hide") {
      return <span className="badge-red">Hide the block</span>;
    }
    return null;
  };

  const getFieldLabel = (field) => {
    switch (field) {
      case "type":
        return "Product type";
      case "tag":
        return "Tag";
      case "title":
        return "Product title";
      case "vendor":
        return "Vendor";
      default:
        return field;
    }
  };

  const getOperatorLabel = (op) => {
    return op === "contains" ? "contains" : "is";
  };

  return (
    <div>
      {/* Top Blue Information Notice */}
      <div className="rules-info-banner">
        <div className="rules-info-icon">ℹ</div>
        <div>
          <h4 className="rules-info-title">Rules are checked from the top down</h4>
          <p className="rules-info-desc">
            The first rule that matches a product wins. Put your most specific rules above the general ones.
          </p>
        </div>
      </div>

      {/* Rules Table Card */}
      <div className="rules-card">
        <div className="rules-card-header">
          <h3 className="rules-card-title">Rules</h3>
          <button type="button" className="btn" onClick={onOpenAddModal}>
            Add rule
          </button>
        </div>

        {rules.length > 0 ? (
          <table className="rules-table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}></th>
                <th style={{ width: "42%" }}>When a product matches</th>
                <th style={{ width: "24%" }}>Then</th>
                <th style={{ width: "10%", textAlign: "center" }}>Status</th>
                <th style={{ width: "20%", textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, idx) => {
                const matchCount = getMatchCount(rule);
                return (
                  <tr key={rule.id || idx}>
                    {/* Priority Reordering Arrows */}
                    <td>
                      <div className="priority-arrows">
                        <button
                          type="button"
                          className="priority-arrow-btn"
                          disabled={idx === 0}
                          onClick={() => onReorderRule(idx, -1)}
                          aria-label="Move rule up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="priority-arrow-btn"
                          disabled={idx === rules.length - 1}
                          onClick={() => onReorderRule(idx, 1)}
                          aria-label="Move rule down"
                        >
                          ▼
                        </button>
                      </div>
                    </td>

                    {/* Rule Match Description */}
                    <td>
                      <div style={{ fontWeight: 600, color: "#1a1a1a" }}>
                        {getFieldLabel(rule.matchField)} {getOperatorLabel(rule.matchOperator)}{" "}
                        <span style={{ color: "#111" }}>{rule.matchValue}</span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#616161", marginTop: "2px" }}>
                        {matchCount} of your sample products match
                      </div>
                    </td>

                    {/* Then Action Badge */}
                    <td>{getBehaviourBadge(rule)}</td>

                    {/* Status Switch */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className={`rules-switch ${rule.isEnabled ? "active" : ""}`}
                        onClick={() => onToggleRuleStatus(idx)}
                        aria-label={`Toggle rule ${rule.matchValue}`}
                      />
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="rules-row-actions">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onOpenEditModal(rule, idx)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rules-remove-btn"
                          onClick={() => onRemoveRule(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#8A8A8A", fontSize: "12.5px", margin: "10px 0 16px" }}>
            No custom rules created yet. All products use the store default.
          </p>
        )}

        <p style={{ fontSize: "12px", color: "#616161", margin: "4px 0 0" }}>
          {activeCount} of {totalCount} rules active. Everything else uses the store default of{" "}
          {storeProcMin || 1}–{storeProcMax || 2} working days.
        </p>
      </div>
    </div>
  );
}
