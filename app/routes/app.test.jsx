import React, { useState, useMemo } from "react";
import { useLoaderData, Link, data } from "react-router";
import {
  format,
  addDays,
  isSameDay,
  differenceInCalendarDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { calculate, isWorkDay } from "../utils/calculator";
import { formatMoney } from "../utils/currency";
import { COUNTRIES } from "../components/Onboarding/steps";
import { MOCK_PRODUCTS, getSavedScenarios } from "../libs/test/scenarios";

import ShopperSimulator from "../components/TestSimulator/ShopperSimulator";
import ResultCard from "../components/TestSimulator/ResultCard";
import WhyThisDateCard from "../components/TestSimulator/WhyThisDateCard";
import DayByDayCard from "../components/TestSimulator/DayByDayCard";
import AdjustmentsCard from "../components/TestSimulator/AdjustmentsCard";
import SavedScenariosCard from "../components/TestSimulator/SavedScenariosCard";
import ActiveScenarioDetailCard from "../components/TestSimulator/ActiveScenarioDetailCard";

import "../styles/test-simulator.css";

export async function loader({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const shopName = session.shop;

  const [shopData, graphResponse] = await Promise.all([
    db.shop.findUnique({
      where: { shop: shopName },
      include: {
        closures: {
          orderBy: { date: "asc" },
        },
        rules: {
          orderBy: { priorityOrder: "asc" },
        },
        zones: {
          orderBy: { isFallback: "asc" },
        },
      },
    }),
    admin.graphql(`
      query getShopMeta {
        shop {
          currencyCode
        }
      }
    `),
  ]);

  const graphJson = await graphResponse.json();
  const currencyCode = graphJson?.data?.shop?.currencyCode || "USD";

  return data({
    shopData: shopData || {},
    currencyCode,
    storeHandle: shopName.split(".")[0],
  });
}

function formatArrivalText(arriveMin, arriveMax) {
  if (!arriveMin || !arriveMax) return "No estimate";
  const sameMonth = arriveMin.getMonth() === arriveMax.getMonth();
  const sameDay = arriveMin.getDate() === arriveMax.getDate() && sameMonth;

  if (sameDay) return format(arriveMin, "d MMMM");
  if (sameMonth) return `${format(arriveMin, "d")}–${format(arriveMax, "d MMMM")}`;
  return `${format(arriveMin, "d MMMM")} – ${format(arriveMax, "d MMMM")}`;
}

function formatShortRange(dMin, dMax) {
  if (!dMin || !dMax) return "";
  const sameMonth = dMin.getMonth() === dMax.getMonth();
  const sameDay = dMin.getDate() === dMax.getDate() && sameMonth;

  if (sameDay) return format(dMin, "d MMM");
  if (sameMonth) return `${format(dMin, "d")}–${format(dMax, "d MMM")}`;
  return `${format(dMin, "d MMM")} – ${format(dMax, "d MMM")}`;
}

export default function TestSimulatorPage() {
  const { shopData, currencyCode } = useLoaderData();

  // Dynamically generated saved scenarios relative to current date and store settings
  const savedScenarios = useMemo(
    () =>
      getSavedScenarios(
        new Date(),
        shopData?.cutoffTime || "14:00",
        shopData?.homeCountry || "IN"
      ),
    [shopData?.cutoffTime, shopData?.homeCountry]
  );

  // Initial preset defaults from Scenario 1
  const initialScenario = savedScenarios[0];
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenario.id);
  const [selectedProductId, setSelectedProductId] = useState(initialScenario.productId);
  const [selectedCountry, setSelectedCountry] = useState(shopData.homeCountry || initialScenario.country);
  const [orderDate, setOrderDate] = useState(initialScenario.orderDate);
  const [deliveryMethod, setDeliveryMethod] = useState(initialScenario.deliveryMethod);

  // Time in minutes from midnight (e.g. 14:40 = 14*60 + 40 = 880)
  const [initialHours, initialMins] = initialScenario.orderTime.split(":").map(Number);
  const [orderTimeMinutes, setOrderTimeMinutes] = useState(initialHours * 60 + initialMins);

  // 1. Time Display Helpers
  const hours = Math.floor(orderTimeMinutes / 60);
  const mins = orderTimeMinutes % 60;
  const timeString = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;

  const selectedCountryName =
    COUNTRIES.find((c) => c.code === selectedCountry)?.name || selectedCountry;
  const shopperTimeNote = `That's ${timeString} on the shopper's clock in ${selectedCountryName}.`;

  // 2. Scenario Switcher Handler
  const handleSelectScenario = (scenario) => {
    setSelectedScenarioId(scenario.id);
    setSelectedProductId(scenario.productId || MOCK_PRODUCTS[0].id);
    setSelectedCountry(scenario.country === "UNKNOWN" ? "US" : scenario.country);
    setOrderDate(scenario.orderDate);
    setDeliveryMethod(scenario.deliveryMethod || "shipping");

    const [h, m] = scenario.orderTime.split(":").map(Number);
    setOrderTimeMinutes(h * 60 + m);
  };

  // 3. Reset to Real Live "Now"
  const handleResetToNow = () => {
    setSelectedScenarioId(null);
    const now = new Date();
    setOrderDate(format(now, "yyyy-MM-dd"));
    setOrderTimeMinutes(now.getHours() * 60 + now.getMinutes());
    setSelectedCountry(shopData.homeCountry || "IN");
    setSelectedProductId(MOCK_PRODUCTS[0].id);
    setDeliveryMethod("shipping");
  };

  // 4. Construct Simulated Date
  const [yearNum, monthNum, dayNum] = orderDate.split("-").map(Number);
  const simulatedDate = new Date(yearNum, (monthNum || 1) - 1, dayNum || 1, hours, mins, 0);

  // 5. Active Product and Mock Overrides
  const activeScenario = savedScenarios.find((s) => s.id === selectedScenarioId);
  const rawProduct =
    MOCK_PRODUCTS.find((p) => p.id === selectedProductId) || MOCK_PRODUCTS[0];

  const productPrice = formatMoney(rawProduct.price || "2400.00", currencyCode);
  const productForCalc = {
    id: rawProduct.id,
    title: rawProduct.title,
    type: rawProduct.productType || "",
    tags: rawProduct.tags || [],
    vendor: rawProduct.vendor || "",
    stock: rawProduct.stock ?? 20,
    procMin: rawProduct.procMin,
    procMax: rawProduct.procMax,
    merchantDate: rawProduct.merchantDate,
    behaviour: rawProduct.behaviour,
    price: productPrice,
  };

  // 6. Closures & Zone Matching
  const activeClosures = [
    ...(shopData.closures || []),
    ...(activeScenario?.mockClosures || []),
  ];

  const matchedZone =
    shopData.zones?.find((z) => z.countries?.includes(selectedCountry)) ||
    shopData.zones?.find((z) => z.isFallback) ||
    shopData.zones?.[0] || {
      name: selectedCountry === "IN" ? "India domestic" : "International zone",
      transitMin: 2,
      transitMax: 4,
      isHome: selectedCountry === (shopData.homeCountry || "IN"),
    };

  // 7. Peak Season Settings Override if Scenario 13
  const activeShopSettings = {
    ...shopData,
    ...(activeScenario?.forcePeakSeason
      ? {
          peakSeasonoEnabled: true,
          peakSeasonStart: "2026-11-15",
          peakSeasonEnd: "2026-12-31",
          peakSeasonTransitMin: 1,
          peakSeasonTransitMax: 3,
        }
      : {}),
  };

  // 8. Run Core Calculation
  const calculation = calculate({
    cutoffTime: shopData.cutoffTime || "14:00",
    workingDays: shopData.workingDays || [1, 2, 3, 4, 5, 6],
    closures: activeClosures,
    carrierSat: Boolean(shopData.carrierSat),
    carrierSun: Boolean(shopData.carrierSun),
    procMin: shopData.procMin ?? 1,
    procMax: shopData.procMax ?? 2,
    rules: shopData.rules || [],
    shopSettings: activeShopSettings,
    product: productForCalc,
    shopperZone: matchedZone,
    currentDate: simulatedDate,
  });

  const arrivalMainText =
    calculation.mode === "ok"
      ? formatArrivalText(calculation.arriveMin, calculation.arriveMax)
      : calculation.mode === "merchant"
      ? formatArrivalText(
          new Date(calculation.merchantDate || simulatedDate),
          addDays(new Date(calculation.merchantDate || simulatedDate), 2)
        )
      : "No estimate";

  const shipShort =
    calculation.mode === "ok"
      ? formatShortRange(calculation.shipMin, calculation.shipMax)
      : "";

  const arriveShort =
    calculation.mode === "ok"
      ? formatShortRange(calculation.arriveMin, calculation.arriveMax)
      : calculation.mode === "merchant"
      ? format(new Date(calculation.merchantDate || simulatedDate), "d MMM")
      : "";

  // 9. Build 5-Step Trace Steps
  const traceSteps = [
    {
      number: "1",
      title: "Order is placed",
      value: format(simulatedDate, "EEE d MMM, HH:mm"),
      description: "The clock starts here.",
      link: null,
    },
    {
      number: "2",
      title: "Cut-off is checked",
      value: `Cut-off ${shopData.cutoffTime || "14:00"}`,
      description: calculation.closedToday
        ? "Ordered on a closed day, so the clock starts on the next open day."
        : calculation.pastCutoff
        ? "Ordered after the cut-off, so this joins tomorrow's dispatch."
        : "Ordered before the cut-off, so this is packed today.",
      link: "/app/processing-time",
    },
    {
      number: "3",
      title: "Dispatch time is added",
      value:
        calculation.mode === "merchant"
          ? `Pre-order: ${format(new Date(calculation.merchantDate || simulatedDate), "d MMM")}`
          : calculation.matchedRule?.behaviour === "estimate"
          ? `${calculation.matchedRule.procMin}–${calculation.matchedRule.procMax} days (Rule)`
          : shopData.oosEnabled && productForCalc.stock <= 0
          ? `${(shopData.procMin ?? 1) + (shopData.oosDays || 0)}–${(shopData.procMax ?? 2) + (shopData.oosDays || 0)} days`
          : `${shopData.procMin ?? 1}–${shopData.procMax ?? 2} days`,
      description: "Working days only. Weekends and closures are skipped.",
      link: "/app/processing-time",
    },
    {
      number: "4",
      title: "Transit time is added",
      value: `${matchedZone.transitMin ?? 2}–${matchedZone.transitMax ?? 4} days`,
      description: `Counted on the carrier's calendar for ${matchedZone.name || "domestic"}.`,
      link: "/app/zones",
    },
    {
      number: "5",
      isFinal: true,
      title: "The shopper sees this",
      value:
        calculation.mode === "hide"
          ? "Hidden"
          : arriveShort || arrivalMainText,
      description: "Rendered on the product page.",
      link: "/app/widget-customization",
    },
  ];

  // 10. Build Day-by-Day Timeline Calendar Strip
  const timelineDays = [];
  let totalCalendarDays = 0;

  if (calculation.mode === "ok" && calculation.arriveMax) {
    totalCalendarDays =
      differenceInCalendarDays(calculation.arriveMax, simulatedDate) + 1;
    const totalSlots = Math.min(
      35,
      differenceInCalendarDays(calculation.arriveMax, simulatedDate) + 2
    );
    const startDay = startOfDay(simulatedDate);
    const shipMinDay = startOfDay(calculation.shipMin);
    const shipMaxDay = endOfDay(calculation.shipMax);
    const arriveMinDay = startOfDay(calculation.arriveMin);
    const arriveMaxDay = endOfDay(calculation.arriveMax);

    for (let i = 0; i < totalSlots; i++) {
      const dayDate = addDays(startDay, i);
      const isOrder = i === 0;
      const isClosed = !isWorkDay(
        dayDate,
        shopData.workingDays || [1, 2, 3, 4, 5, 6],
        activeClosures
      );

      const isPacking = dayDate >= shipMinDay && dayDate <= shipMaxDay;
      const isArrival = dayDate >= arriveMinDay && dayDate <= arriveMaxDay;
      const isTransit = dayDate > shipMaxDay && dayDate < arriveMinDay;

      let type = "regular";
      let tag = "";

      if (isOrder) {
        type = "order";
        tag = "ORDER";
      } else if (isArrival) {
        type = "arrival";
        if (isSameDay(dayDate, calculation.arriveMin)) tag = "ARRIVES";
        else if (isSameDay(dayDate, calculation.arriveMax)) tag = "LATEST";
      } else if (isPacking) {
        type = "packing";
        if (isSameDay(dayDate, calculation.shipMin)) tag = "SHIPS";
        else if (isSameDay(dayDate, calculation.shipMax)) tag = "LATEST";
      } else if (isTransit) {
        type = "transit";
      } else if (isClosed) {
        type = "closed";
      }

      timelineDays.push({
        date: dayDate,
        fullDateStr: format(dayDate, "EEE d MMM yyyy"),
        dayLetter: format(dayDate, "EEEEE"),
        dayNumber: format(dayDate, "d"),
        type,
        tag,
        isClosed,
      });
    }
  }

  // 11. Build Adjustments Applied List
  const adjustments = [];
  if (shopData.customsClearanceEnabled && !matchedZone.isHome) {
    adjustments.push({
      title: "Customs buffer",
      description: `+${shopData.customsClearanceDays || 2} days on the slow end, because ${selectedCountryName} is outside your home country.`,
    });
  }

  const isPeakSeasonActive =
    activeShopSettings.peakSeasonoEnabled &&
    format(simulatedDate, "yyyy-MM-dd") >= (activeShopSettings.peakSeasonStart || "") &&
    format(simulatedDate, "yyyy-MM-dd") <= (activeShopSettings.peakSeasonEnd || "");

  if (isPeakSeasonActive) {
    adjustments.push({
      title: "Peak season",
      description: `+${activeShopSettings.peakSeasonTransitMin || 1} to +${
        activeShopSettings.peakSeasonTransitMax || 3
      } days, because dispatch falls inside your peak window.`,
    });
  }

  if (shopData.oosEnabled && productForCalc.stock <= 0) {
    adjustments.push({
      title: "Out-of-stock buffer",
      description: `+${shopData.oosDays || 7} days added to dispatch for backordered items.`,
    });
  }

  return (
    <div className="sim-page">
      {/* Page Header */}
      <div className="sim-header">
        <div>
          <h1 className="sim-title">Preview & test</h1>
          <p className="sim-subtitle">
            Run any product, country and moment through the calculation before a shopper does.
          </p>
        </div>

        <div>
          <Link to="/app/widget-customization" className="btn">
            Edit wording
          </Link>
        </div>
      </div>

      {/* 2-Column Main Layout */}
      <div className="sim-layout-grid">
        {/* Left Column: Shopper Simulator + Saved Scenarios + Active Scenario Detail + Adjustments */}
        <div className="sim-left-column">
          {/* 1. Shopper Simulator Form Controls */}
          <ShopperSimulator
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            orderDate={orderDate}
            setOrderDate={setOrderDate}
            deliveryMethod={deliveryMethod}
            setDeliveryMethod={setDeliveryMethod}
            orderTimeMinutes={orderTimeMinutes}
            setOrderTimeMinutes={setOrderTimeMinutes}
            onResetToNow={handleResetToNow}
            timeString={timeString}
            shopperTimeNote={shopperTimeNote}
          />

          {/* 2. Saved Scenarios List */}
          <SavedScenariosCard
            scenarios={savedScenarios}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={handleSelectScenario}
          />

          {/* 3. Active Scenario Detail Card */}
          <ActiveScenarioDetailCard
            scenarios={savedScenarios}
            selectedScenarioId={selectedScenarioId}
          />

          {/* 4. Adjustments Applied Card */}
          <AdjustmentsCard adjustments={adjustments} />
        </div>

        {/* Right Column: Result Live Preview + Why This Date Trace + Day by Day Timeline */}
        <div className="sim-right-column">
          {/* 1. Result Live Preview */}
          <ResultCard
            product={productForCalc}
            calculation={calculation}
            shipShort={shipShort}
            shopperZone={matchedZone}
            shopData={shopData}
            simulatedDate={simulatedDate}
            selectedCountry={selectedCountry}
          />

          {/* 2. Why This Date Trace */}
          <WhyThisDateCard steps={traceSteps} />

          {/* 3. Day by Day Timeline Strip */}
          {calculation.mode === "ok" && (
            <DayByDayCard
              timelineDays={timelineDays}
              totalCalendarDays={totalCalendarDays}
              shipShort={shipShort}
              arriveShort={arriveShort}
            />
          )}
        </div>
      </div>
    </div>
  );
}
