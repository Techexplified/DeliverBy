// app/libs/settings/defaults.js

export const DEFAULT_SHOP_SETTINGS = {
  // --- Processing ---
  timezone: "Asia/Kolkata",
  cutoffTime: "14:00",
  procMin: 1,
  procMax: 2,
  oosEnabled: true,
  oosDays: 10,

  // --- Working Schedule ---
  workingDays: [1, 2, 3, 4, 5, 6],
  carrierSat: false,
  carrierSun: false,

  // --- Shipping & Safety Buffers ---
  homeCountry: "IN",
  customsClearanceEnabled: false,
  customsClearanceDays: 2,
  peakSeasonoEnabled: false,
  peakSeasonStart: null,
  peakSeasonEnd: null,
  peakSeasonTransitMin: 1,
  peakSeasonTransitMax: 3,

  // --- Widget Design ---
  dateFormat: "range",
  dateStyle: "full",
  mainLine: "Get it {date}",
  supportingLine: "Dispatched from Kolkata",
  fallbackText: "Enter your postcode for a delivery date",
  showCutoffCountdown: true,
  showBreakdown: true,
  showDeliveryIcon: true,
  hideWhenNoRule: false,
  widgetContainer: "none",
  widgetAlignment: "left",
  widgetIcon: "van",
  widgetAccentColor: "#1A5D38",
  widgetPosition: "below-atc",

  // --- Location Settings ---
  detectionMethod: "ip",
  locationFallback: "ask",
};

export const DEFAULT_ZONES = [
  {
    name: "India domestic",
    countries: ["IN"],
    transitMin: 2,
    transitMax: 4,
    isHome: true,
    isFallback: false,
  },
  {
    name: "United States",
    countries: ["US"],
    transitMin: 6,
    transitMax: 9,
    isHome: false,
    isFallback: false,
  },
  {
    name: "Europe",
    countries: ["GB", "DE", "FR", "NL", "IE", "ES", "IT"],
    transitMin: 5,
    transitMax: 8,
    isHome: false,
    isFallback: false,
  },
  {
    name: "Australia & New Zealand",
    countries: ["AU", "NZ"],
    transitMin: 8,
    transitMax: 12,
    isHome: false,
    isFallback: false,
  },
  {
    name: "Rest of world",
    countries: [],
    transitMin: 12,
    transitMax: 24,
    isHome: false,
    isFallback: true,
  },
];

export const DEFAULT_RULES = [
  {
    priorityOrder: 0,
    matchField: "type",
    matchOperator: "is",
    matchValue: "Made to order",
    behaviour: "estimate",
    procMin: 14,
    procMax: 21,
    isEnabled: false,
  },
  {
    priorityOrder: 1,
    matchField: "tag",
    matchOperator: "is",
    matchValue: "preorder",
    behaviour: "merchant",
    procMin: 0,
    procMax: 0,
    isEnabled: false,
  },
  {
    priorityOrder: 2,
    matchField: "type",
    matchOperator: "is",
    matchValue: "Digital",
    behaviour: "hide",
    procMin: 0,
    procMax: 0,
    isEnabled: false,
  },
];
