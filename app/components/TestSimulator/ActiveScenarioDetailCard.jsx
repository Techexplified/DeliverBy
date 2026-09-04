import React from "react";
import { SAVED_SCENARIOS } from "../../libs/test/scenarios";

export default function ActiveScenarioDetailCard({ selectedScenarioId }) {
  const activeScenario =
    SAVED_SCENARIOS.find((s) => s.id === selectedScenarioId) ||
    SAVED_SCENARIOS[0];

  if (!activeScenario) return null;

  return (
    <div className="sim-card sim-scenario-detail-card">
      <div className="sim-scenario-detail-header">
        <h4 className="sim-scenario-detail-title">{activeScenario.title}</h4>
        {activeScenario.badge && (
          <span className="sim-scenario-badge">{activeScenario.badge}</span>
        )}
      </div>
      <p className="sim-scenario-detail-text">{activeScenario.explanation}</p>
    </div>
  );
}
