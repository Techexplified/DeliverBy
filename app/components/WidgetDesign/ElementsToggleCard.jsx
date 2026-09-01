import React from "react";

export default function ElementsToggleCard({
  showCutoffCountdown,
  showBreakdown,
  showDeliveryIcon,
  onUpdateField,
}) {
  return (
    <div className="wd-card">
      <h3 className="wd-card-title">What's inside the block</h3>

      {/* Switch 1: Cut-off countdown */}
      <div className="switch-row">
        <div>
          <h4 className="switch-info-title">Cut-off countdown</h4>
          <p className="switch-info-desc">
            "Order within 2h 15m for today's dispatch". Only shown when the cut-off is still catchable.
          </p>
        </div>
        <button
          type="button"
          className={`wd-switch ${showCutoffCountdown ? "active" : ""}`}
          onClick={() => onUpdateField("showCutoffCountdown", !showCutoffCountdown)}
          aria-label="Toggle Cut-off countdown"
        />
      </div>

      {/* Switch 2: Dispatch and transit breakdown */}
      <div className="switch-row">
        <div>
          <h4 className="switch-info-title">Dispatch and transit breakdown</h4>
          <p className="switch-info-desc">
            Reassuring on made-to-order furniture, clutter on a t-shirt.
          </p>
        </div>
        <button
          type="button"
          className={`wd-switch ${showBreakdown ? "active" : ""}`}
          onClick={() => onUpdateField("showBreakdown", !showBreakdown)}
          aria-label="Toggle Breakdown"
        />
      </div>

      {/* Switch 3: Delivery icon */}
      <div className="switch-row">
        <div>
          <h4 className="switch-info-title">Delivery icon</h4>
          <p className="switch-info-desc">A small mark beside the date.</p>
        </div>
        <button
          type="button"
          className={`wd-switch ${showDeliveryIcon ? "active" : ""}`}
          onClick={() => onUpdateField("showDeliveryIcon", !showDeliveryIcon)}
          aria-label="Toggle Delivery icon"
        />
      </div>
    </div>
  );
}
