import React from "react";

export default function AdjustmentsCard({ adjustments }) {
  if (!adjustments || adjustments.length === 0) return null;

  return (
    <div className="sim-card sim-adjustments-card">
      <div className="sim-card-header">
        <h3 className="sim-card-title">Adjustments applied</h3>
      </div>

      <div className="sim-adjustments-list">
        {adjustments.map((adj, idx) => (
          <div key={idx} className="sim-adjustment-item">
            <h4 className="sim-adjustment-title">{adj.title}</h4>
            <p className="sim-adjustment-desc">{adj.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
