import React, { useState, useEffect } from "react";
import { data, useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { format } from "date-fns";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { calculate } from "../utils/calculator";
import ZonesTable from "../components/Zones/ZonesTable";
import CarrierDaysCard from "../components/Zones/CarrierDaysCard";
import SafetyBuffersCard from "../components/Zones/SafetyBuffersCard";
import ZoneModal from "../components/Zones/ZoneModal";
import "../styles/zones.css";

export const COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "IE", name: "Ireland" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "CA", name: "Canada" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "ZA", name: "South Africa" },
  { code: "MX", name: "Mexico" },
  { code: "OT", name: "Other" },
];

export const DEFAULT_ZONES = [
  { name: "India domestic", countries: ["IN"], transitMin: 2, transitMax: 4, isHome: true, isFallback: false },
  { name: "United States", countries: ["US"], transitMin: 6, transitMax: 9, isHome: false, isFallback: false },
  { name: "Europe", countries: ["GB", "DE", "FR", "NL", "IE", "ES", "IT"], transitMin: 5, transitMax: 8, isHome: false, isFallback: false },
  { name: "Australia & New Zealand", countries: ["AU", "NZ"], transitMin: 8, transitMax: 12, isHome: false, isFallback: false },
  { name: "Rest of world", countries: [], transitMin: 12, transitMax: 24, isHome: false, isFallback: true },
];

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shopName = session.shop;

  const shopData = await db.shop.findUnique({
    where: { shop: shopName },
    include: {
      zones: {
        orderBy: { isFallback: "asc" },
      },
      closures: true,
    },
  });

  return data({ shopData });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shopName = session.shop;
  const payload = await request.json();
  const { intent, shopData, zones } = payload;

  if (intent === "save") {
    await db.$transaction(async (tx) => {
      const shop = await tx.shop.findUnique({
        where: { shop: shopName },
        select: { id: true },
      });

      if (!shop) return;

      await tx.shop.update({
        where: { id: shop.id },
        data: {
          carrierSat: Boolean(shopData?.carrierSat),
          carrierSun: Boolean(shopData?.carrierSun),
          customsClearanceEnabled: Boolean(shopData?.customsClearanceEnabled),
          customsClearanceDays: Number(shopData?.customsClearanceDays ?? 2),
          peakSeasonoEnabled: Boolean(shopData?.peakSeasonoEnabled),
          peakSeasonStart: shopData?.peakSeasonStart || null,
          peakSeasonEnd: shopData?.peakSeasonEnd || null,
          peakSeasonTransitMin: Number(shopData?.peakSeasonTransitMin ?? 1),
          peakSeasonTransitMax: Number(shopData?.peakSeasonTransitMax ?? 3),
        },
      });

      await tx.deliveryZone.deleteMany({
        where: { shopId: shop.id },
      });

      if (zones && zones.length > 0) {
        await tx.deliveryZone.createMany({
          data: zones.map((z) => ({
            shopId: shop.id,
            name: z.name,
            countries: z.countries || [],
            transitMin: Number(z.transitMin ?? 2),
            transitMax: Number(z.transitMax ?? 4),
            isHome: Boolean(z.isHome),
            isFallback: Boolean(z.isFallback),
          })),
        });
      }
    });

    return data({ success: true });
  }

  return data({ success: false });
}

export function getZoneArrivalText(zone, formData) {
  if (!zone) return "—";
  const now = new Date();

  const calcResult = calculate({
    cutoffTime: formData.cutoffTime || "14:00",
    workingDays: formData.workingDays || [1, 2, 3, 4, 5, 6],
    closures: formData.closures || [],
    carrierSat: Boolean(formData.carrierSat),
    carrierSun: Boolean(formData.carrierSun),
    procMin: formData.procMin ?? 1,
    procMax: formData.procMax ?? 2,
    rules: [],
    shopSettings: formData,
    shopperZone: zone,
    currentDate: now,
  });

  if (calcResult.mode !== "ok" || !calcResult.arriveMin || !calcResult.arriveMax) {
    return "—";
  }

  const { arriveMin, arriveMax } = calcResult;
  const sameMonth = arriveMin.getMonth() === arriveMax.getMonth();
  const sameYear = arriveMin.getFullYear() === arriveMax.getFullYear();

  if (sameMonth && sameYear) {
    return `${format(arriveMin, "d")}–${format(arriveMax, "d MMM")}`;
  }

  return `${format(arriveMin, "EEE d MMM")} – ${format(arriveMax, "EEE d MMM")}`;
}

export default function Zones() {
  const { shopData } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [formData, setFormData] = useState({
    cutoffTime: shopData?.cutoffTime || "14:00",
    timezone: shopData?.timezone || "Asia/Kolkata",
    procMin: shopData?.procMin ?? 1,
    procMax: shopData?.procMax ?? 2,
    workingDays: shopData?.workingDays || [1, 2, 3, 4, 5, 6],
    closures: shopData?.closures || [],
    carrierSat: Boolean(shopData?.carrierSat),
    carrierSun: Boolean(shopData?.carrierSun),
    customsClearanceEnabled: Boolean(shopData?.customsClearanceEnabled),
    customsClearanceDays: shopData?.customsClearanceDays ?? 2,
    peakSeasonoEnabled: Boolean(shopData?.peakSeasonoEnabled),
    peakSeasonStart: shopData?.peakSeasonStart || "",
    peakSeasonEnd: shopData?.peakSeasonEnd || "",
    peakSeasonTransitMin: shopData?.peakSeasonTransitMin ?? 1,
    peakSeasonTransitMax: shopData?.peakSeasonTransitMax ?? 3,
    zones: (shopData?.zones && shopData.zones.length > 0) ? shopData.zones : DEFAULT_ZONES,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Saved");
    }
  }, [fetcher.data, shopify]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateZoneTransit = (index, minOrMax, value) => {
    setFormData((prev) => {
      const updatedZones = [...prev.zones];
      updatedZones[index] = {
        ...updatedZones[index],
        [minOrMax]: value,
      };
      return { ...prev, zones: updatedZones };
    });
  };

  const handleOpenAddModal = () => {
    setEditingZone(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (zone, index) => {
    setEditingZone(zone);
    setIsModalOpen(true);
  };

  const handleRemoveZone = (index) => {
    setFormData((prev) => {
      const zoneToRemove = prev.zones[index];
      if (zoneToRemove?.isFallback) {
        shopify.toast.show("Cannot remove the catch-all zone");
        return prev;
      }
      return {
        ...prev,
        zones: prev.zones.filter((_, idx) => idx !== index),
      };
    });
  };

  const handleSaveZoneModal = (savedZone) => {
    setFormData((prev) => {
      let updatedZones = [...prev.zones];

      // If this zone is marked as Home, unmark home from all other zones
      if (savedZone.isHome) {
        updatedZones = updatedZones.map((z) => ({
          ...z,
          isHome: z.id === savedZone.id,
        }));
      }

      const existingIndex = updatedZones.findIndex((z) => z.id === savedZone.id);
      if (existingIndex >= 0) {
        updatedZones[existingIndex] = savedZone;
      } else {
        // Insert before fallback (catch-all) zone if present
        const fallbackIndex = updatedZones.findIndex((z) => z.isFallback);
        if (fallbackIndex >= 0) {
          updatedZones.splice(fallbackIndex, 0, savedZone);
        } else {
          updatedZones.push(savedZone);
        }
      }

      return { ...prev, zones: updatedZones };
    });
  };

  const handleSave = () => {
    fetcher.submit(
      {
        intent: "save",
        shopData: formData,
        zones: formData.zones,
      },
      {
        method: "POST",
        encType: "application/json",
      }
    );
  };

  return (
    <div className="zones-page">
      {/* Header */}
      <div className="zones-header">
        <div>
          <h1 className="zones-title">Delivery zones</h1>
          <p className="zones-subtitle">
            How long the carrier takes, grouped by destination.
          </p>
        </div>

        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Section 1: Transit times Table */}
      <ZonesTable
        zones={formData.zones}
        formData={formData}
        onUpdateZoneTransit={handleUpdateZoneTransit}
        onOpenAddModal={handleOpenAddModal}
        onOpenEditModal={handleOpenEditModal}
        onRemoveZone={handleRemoveZone}
      />

      {/* Section 2: Carrier working days */}
      <CarrierDaysCard
        carrierSat={formData.carrierSat}
        carrierSun={formData.carrierSun}
        onUpdateField={updateField}
      />

      {/* Section 3: Safety buffers */}
      <SafetyBuffersCard
        customsClearanceEnabled={formData.customsClearanceEnabled}
        customsClearanceDays={formData.customsClearanceDays}
        peakSeasonoEnabled={formData.peakSeasonoEnabled}
        peakSeasonStart={formData.peakSeasonStart}
        peakSeasonEnd={formData.peakSeasonEnd}
        peakSeasonTransitMin={formData.peakSeasonTransitMin}
        peakSeasonTransitMax={formData.peakSeasonTransitMax}
        onUpdateField={updateField}
      />

      {/* Add / Edit Zone Modal */}
      <ZoneModal
        isOpen={isModalOpen}
        editingZone={editingZone}
        existingZones={formData.zones}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveZoneModal}
      />
    </div>
  );
}