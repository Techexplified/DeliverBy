import React from "react";
import { SAVED_SCENARIOS } from "../../libs/test/scenarios";

export default function SavedScenariosCard({
  scenarios = SAVED_SCENARIOS,
  selectedScenarioId,
  onSelectScenario,
}) {
  return (
    <div className="sim-card sim-scenarios-card">
      <div className="sim-scenarios-header">
        <h3 className="sim-card-title">Saved scenarios</h3>
        <p className="sim-scenarios-subtitle">
          Load a known-tricky situation and check the block still reads sensibly.
        </p>
      </div>

      <div className="sim-scenarios-list">
        {scenarios.map((scenario) => {
          const isSelected = scenario.id === selectedScenarioId;
          return (
            <button
              key={scenario.id}
              type="button"
              className={`sim-scenario-item ${
                isSelected ? "sim-scenario-active" : ""
              }`}
              onClick={() => onSelectScenario(scenario)}
            >
              <span className="sim-scenario-num">{scenario.number}</span>
              <div className="sim-scenario-info">
                <span className="sim-scenario-title">{scenario.title}</span>
                <span className="sim-scenario-sub">{scenario.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
