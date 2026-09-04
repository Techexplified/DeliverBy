import React from "react";
import { COUNTRIES } from "../Onboarding/steps";
import { MOCK_PRODUCTS } from "../../libs/test/scenarios";

export default function ShopperSimulator({
  selectedProductId,
  setSelectedProductId,
  selectedCountry,
  setSelectedCountry,
  orderDate,
  setOrderDate,
  deliveryMethod,
  setDeliveryMethod,
  orderTimeMinutes,
  setOrderTimeMinutes,
  onResetToNow,
  timeString,
  shopperTimeNote,
}) {
  return (
    <div className="sim-card">
      <div className="sim-card-header">
        <h3 className="sim-card-title">Shopper simulator</h3>
        <button
          type="button"
          className="sim-link-btn"
          onClick={onResetToNow}
        >
          Reset to now
        </button>
      </div>

      <div className="sim-form-grid">
        {/* Product Select */}
        <div className="sim-field">
          <label className="sim-label" htmlFor="sim-product">
            Product <span style={{ fontWeight: 400, color: "#616161", fontSize: "11.5px" }}>(Mock Data)</span>
          </label>
          <select
            id="sim-product"
            className="sim-select"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            {MOCK_PRODUCTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Country Select */}
        <div className="sim-field">
          <label className="sim-label" htmlFor="sim-country">
            Shopper's country
          </label>
          <select
            id="sim-country"
            className="sim-select"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Order Date Picker */}
        <div className="sim-field">
          <label className="sim-label" htmlFor="sim-date">
            Order date
          </label>
          <input
            id="sim-date"
            type="date"
            className="sim-input"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
          />
        </div>

        {/* Delivery Method Select */}
        <div className="sim-field">
          <label className="sim-label" htmlFor="sim-method">
            Delivery method
          </label>
          <select
            id="sim-method"
            className="sim-select"
            value={deliveryMethod}
            onChange={(e) => setDeliveryMethod(e.target.value)}
          >
            <option value="shipping">Shipping</option>
          </select>
        </div>
      </div>

      {/* Order Time Slider */}
      <div className="sim-time-slider-box">
        <div className="sim-time-header">
          <label className="sim-label" htmlFor="sim-time-slider">
            Order time — <strong>{timeString}</strong> store time
          </label>
        </div>
        <input
          id="sim-time-slider"
          type="range"
          min="0"
          max="1439"
          step="5"
          className="sim-slider"
          value={orderTimeMinutes}
          onChange={(e) => setOrderTimeMinutes(Number(e.target.value))}
        />
        <p className="sim-time-note">{shopperTimeNote}</p>
      </div>
    </div>
  );
}
