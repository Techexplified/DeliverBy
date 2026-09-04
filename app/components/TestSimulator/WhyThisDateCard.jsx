import React from "react";
import { Link } from "react-router";

export default function WhyThisDateCard({ steps }) {
  return (
    <div className="sim-card sim-why-card">
      <div className="sim-card-header">
        <h3 className="sim-card-title">Why this date</h3>
      </div>

      <div className="sim-trace-list">
        {steps.map((step, idx) => {
          const isFinal = step.isFinal;
          return (
            <div
              key={idx}
              className={`sim-trace-step ${isFinal ? "sim-trace-step-final" : ""}`}
            >
              <div className="sim-trace-step-left">
                <div
                  className={`sim-trace-num ${
                    isFinal ? "sim-trace-num-final" : ""
                  }`}
                >
                  {isFinal ? "✓" : step.number}
                </div>
                <div className="sim-trace-info">
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                  {step.link && (
                    <Link to={step.link} className="sim-trace-link">
                      Change this
                    </Link>
                  )}
                </div>
              </div>
              <div
                className={`sim-trace-val ${
                  isFinal ? "sim-trace-val-final" : ""
                }`}
              >
                {step.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
