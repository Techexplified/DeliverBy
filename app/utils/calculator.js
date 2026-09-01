// app/utils/calculator.js
import { addDays, format } from "date-fns";

export function isClosure(date, closures = []) {
  const dateStr = format(date, "yyyy-MM-dd");
  return closures.some((c) => (typeof c === "string" ? c : c.date) === dateStr);
}

export function isWorkDay(date, workingDays = [], closures = []) {
  if (isClosure(date, closures)) return false;
  return workingDays.includes(date.getDay());
}

export function isCarrierDay(date, carrierSat = false, carrierSun = false, closures = []) {
  if (isClosure(date, closures)) return false;
  const day = date.getDay();
  if (day === 0) return Boolean(carrierSun);
  if (day === 6) return Boolean(carrierSat);
  return true;
}

export function getNextWorkDay(startDate, workingDays = [], closures = []) {
  let date = startDate;
  let safety = 0;
  do {
    date = addDays(date, 1);
    safety++;
  } while (!isWorkDay(date, workingDays, closures) && safety < 365);
  return date;
}

export function addWorkingDays(startDate, daysCount, workingDays = [], closures = []) {
  let currentDate = startDate;
  while (daysCount > 0) {
    currentDate = addDays(currentDate, 1);
    if (isWorkDay(currentDate, workingDays, closures)) {
      daysCount -= 1;
    }
  }
  return currentDate;
}

export function addCarrierDays(startDate, daysCount, carrierSat = false, carrierSun = false, closures = []) {
  let currentDate = startDate;
  while (daysCount > 0) {
    currentDate = addDays(currentDate, 1);
    if (isCarrierDay(currentDate, carrierSat, carrierSun, closures)) {
      daysCount -= 1;
    }
  }
  return currentDate;
}

export function findMatchingRule(product, rules = []) {
  if (!product || !Array.isArray(rules)) return null;

  return rules.find((rule) => {
    if (!rule.isEnabled) return false;
    const ruleVal = String(rule.matchValue || "").trim().toLowerCase();
    if (!ruleVal) return false;

    let target = "";
    if (rule.matchField === "type") target = product.type || product.productType || "";
    else if (rule.matchField === "vendor") target = product.vendor || "";
    else if (rule.matchField === "title") target = product.title || "";
    else if (rule.matchField === "tag") {
      const tags = Array.isArray(product.tags)
        ? product.tags
        : String(product.tags || "").split(",");
      return tags.some((t) =>
        rule.matchOperator === "is"
          ? t.trim().toLowerCase() === ruleVal
          : t.trim().toLowerCase().includes(ruleVal)
      );
    }

    target = target.toLowerCase();
    return rule.matchOperator === "is"
      ? target === ruleVal
      : target.includes(ruleVal);
  });
}

export function checkAndAddSafetyBuffers({
  currentDate = new Date(),
  transitMin = 2,
  transitMax = 4,
  shopperZone = {},
  shopSettings = {},
}) {
  let finalTransitMin = Number(transitMin) || 0;
  let finalTransitMax = Number(transitMax) || 0;

  // 1. Customs Clearance Buffer (applied to slowest estimate for non-home zones)
  if (shopSettings.customsClearanceEnabled && !shopperZone?.isHome) {
    finalTransitMax += Number(shopSettings.customsClearanceDays || 0);
  }

  // 2. Peak Season Buffer (widens whole range during peak window)
  if (
    shopSettings.peakSeasonoEnabled &&
    shopSettings.peakSeasonStart &&
    shopSettings.peakSeasonEnd
  ) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const isPeak =
      dateStr >= shopSettings.peakSeasonStart &&
      dateStr <= shopSettings.peakSeasonEnd;

    if (isPeak) {
      finalTransitMin += Number(shopSettings.peakSeasonTransitMin || 0);
      finalTransitMax += Number(shopSettings.peakSeasonTransitMax || 0);
    }
  }

  return {
    transitMin: finalTransitMin,
    transitMax: finalTransitMax,
  };
}

export function calculate({
  cutoffTime = "14:00",
  rules = [],
  closures = [],
  shopSettings = {},
  product = {},
  workingDays = [1, 2, 3, 4, 5, 6],
  carrierSat = false,
  carrierSun = false,
  procMin = 1,
  procMax = 2,
  shopperZone = { transitMin: 2, transitMax: 4, isHome: true },
  currentDate = new Date(),
}) {
  // 1. If no working days are configured, calculation cannot proceed
  if (!workingDays || workingDays.length === 0) {
    return { mode: "error", reason: "No working days configured" };
  }

  // 2. Product rules take priority (first match wins)
  const matchedRule = findMatchingRule(product, rules);
  if (matchedRule) {
    if (matchedRule.behaviour === "hide") {
      return { mode: "hide", matchedRule };
    }
    if (matchedRule.behaviour === "merchant") {
      return {
        mode: "merchant",
        merchantDate: product.merchantDate || null,
        matchedRule,
      };
    }
    if (matchedRule.behaviour === "estimate") {
      procMin = matchedRule.procMin;
      procMax = matchedRule.procMax;
    }
  } else if (shopSettings?.oosEnabled && product?.stock <= 0) {
    // Out of stock extra allowance (only if no rule took over)
    const oosExtra = shopSettings.oosDays || 0;
    procMin += oosExtra;
    procMax += oosExtra;
  }

  // 3. Cut-off and opening check
  const [hours = 14, minutes = 0] = String(cutoffTime).split(":").map(Number);
  const cutoffInMinutes = hours * 60 + minutes;
  const currentTimeInMins = currentDate.getHours() * 60 + currentDate.getMinutes();

  const pastCutoff = currentTimeInMins >= cutoffInMinutes;
  const closedToday = !isWorkDay(currentDate, workingDays, closures);

  // If after cut-off or shop is closed today, clock starts on next working day
  const startDay =
    pastCutoff || closedToday
      ? getNextWorkDay(currentDate, workingDays, closures)
      : currentDate;

  // 4. Calculate dispatch (leaving warehouse)
  const shipMin = addWorkingDays(startDay, procMin, workingDays, closures);
  const shipMax = addWorkingDays(startDay, procMax, workingDays, closures);

  // 5. Calculate delivery with safety buffers applied
  const { transitMin, transitMax } = checkAndAddSafetyBuffers({
    currentDate,
    transitMin: shopperZone?.transitMin ?? 2,
    transitMax: shopperZone?.transitMax ?? 4,
    shopperZone,
    shopSettings,
  });

  const arriveMin = addCarrierDays(shipMin, transitMin, carrierSat, carrierSun, closures);
  const arriveMax = addCarrierDays(shipMax, transitMax, carrierSat, carrierSun, closures);

  return {
    mode: "ok",
    startDay,
    shipMin,
    shipMax,
    arriveMin,
    arriveMax,
    pastCutoff,
    closedToday,
    matchedRule,
  };
}
