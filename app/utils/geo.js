// app/utils/geo.js

/**
 * Detects country ISO-2 code from a postal code / PIN code format
 */
export function detectCountryFromPostalCode(input) {
  if (!input || typeof input !== "string") return null;
  const clean = input.trim().toUpperCase();

  // 1. India: 6 digits (e.g. 560001, 110001)
  if (/^[1-9][0-9]{5}$/.test(clean)) {
    return "IN";
  }

  // 2. United Kingdom: (e.g. SW1A 1AA, EC1A 1BB, M1 1AE, W1A 0AX)
  if (/^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i.test(clean)) {
    return "GB";
  }

  // 3. Canada: (e.g. K1A 0B1, M5V 2T6)
  if (/^[A-Z][0-9][A-Z]\s?[0-9][A-Z][0-9]$/i.test(clean)) {
    return "CA";
  }

  // 4. Australia / NZ: 4 digits (e.g. 2000, 3000)
  if (/^[0-9]{4}$/.test(clean)) {
    return "AU";
  }

  // 5. United States: 5 digits or ZIP+4 (e.g. 90210, 10001, 90210-1234)
  if (/^\d{5}(-\d{4})?$/.test(clean)) {
    return "US";
  }

  // 6. Generic 5-digit EU (DE/FR/IT/ES)
  if (/^[0-9]{5}$/.test(clean)) {
    return "DE";
  }

  return null;
}

/**
 * Resolves a delivery zone based on country code
 */
export function resolveZoneByCountry(countryCode, zones = []) {
  if (!zones || zones.length === 0) {
    return { name: "Domestic", transitMin: 2, transitMax: 4, isHome: true };
  }

  if (!countryCode) {
    return zones.find((z) => z.isHome) || zones.find((z) => z.isFallback) || zones[0];
  }

  const match = zones.find((z) =>
    (z.countries || []).some((c) => c.toUpperCase() === countryCode.toUpperCase())
  );

  if (match) return match;

  // Fallback to Catch-all zone
  return zones.find((z) => z.isFallback) || zones[0];
}
