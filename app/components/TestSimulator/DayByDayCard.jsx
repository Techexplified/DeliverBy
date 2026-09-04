import React from "react";

export default function DayByDayCard({
  timelineDays,
  totalCalendarDays,
  shipShort,
  arriveShort,
}) {
  return (
    <div className="sim-card sim-day-by-day-card">
      <div className="sim-card-header">
        <h3 className="sim-card-title">Day by day</h3>
      </div>

      {/* Legend */}
      <div className="sim-timeline-legend">
        <span className="sim-legend-chip sim-legend-order">Order placed</span>
        <span className="sim-legend-chip sim-legend-packing">Packing</span>
        <span className="sim-legend-chip sim-legend-transit">In transit</span>
        <span className="sim-legend-chip sim-legend-arrival">Arrival window</span>
      </div>

      {/* Calendar Timeline Strip */}
      <div className="sim-timeline-strip-container">
        <div className="sim-timeline-strip">
          {timelineDays.map((day, idx) => (
            <div key={idx} className="sim-timeline-day">
              <span className="sim-day-name">{day.dayLetter}</span>
              <div
                className={`sim-day-box sim-day-${day.type} ${
                  day.isClosed ? "sim-day-closed" : ""
                }`}
                title={`${day.fullDateStr}${day.isClosed ? " (Closed day)" : ""}`}
              >
                {day.dayNumber}
              </div>
              <span className="sim-day-tag">{day.tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="sim-timeline-footer">
        <span>
          Total <strong>{totalCalendarDays} days</strong>
        </span>
        {shipShort && (
          <span>
            Dispatch <strong>{shipShort}</strong>
          </span>
        )}
        {arriveShort && (
          <span>
            Arrives <strong>{arriveShort}</strong>
          </span>
        )}
        <span className="sim-footer-muted">Hatched days are closed</span>
      </div>
    </div>
  );
}
