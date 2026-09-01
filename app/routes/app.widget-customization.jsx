import { data, useLoaderData, useFetcher } from "react-router";
import { useState, useEffect } from "react";
import db from "../db.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import DateFormatCard from "../components/WidgetDesign/DateFormatCard";
import WordingCard from "../components/WidgetDesign/WordingCard";
import ElementsToggleCard from "../components/WidgetDesign/ElementsToggleCard";
import AppearanceCard from "../components/WidgetDesign/AppearanceCard";
import LiveWidgetPreview from "../components/WidgetDesign/LiveWidgetPreview";
import "../styles/widget-design.css";

export async function loader({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const shopName = session.shop;

  const [shopData, productResponse] = await Promise.all([
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
      query getProducts {
        products(first: 50) {
          nodes {
            id
            title
            handle
            vendor
            productType
            tags
            totalInventory
            variants(first: 1) {
              nodes {
                price
              }
            }
          }
        }
      }
    `),
  ]);

  const productJson = await productResponse.json();
  const productData = productJson?.data?.products?.nodes || [];

  return data({ shopData, productData });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shopName = session.shop;
  const payload = await request.json();
  const { intent, widgetData } = payload;

  if (intent === "save") {
    await db.shop.update({
      where: { shop: shopName },
      data: {
        dateFormat: widgetData.dateFormat || "range",
        dateStyle: widgetData.dateStyle || "full",
        mainLine: widgetData.mainLine || "Get it {date}",
        supportingLine: widgetData.supportingLine || "Dispatched from Kolkata",
        fallbackText: widgetData.fallbackText || "Enter your postcode for a delivery date",
        showCutoffCountdown: Boolean(widgetData.showCutoffCountdown),
        showBreakdown: Boolean(widgetData.showBreakdown),
        showDeliveryIcon: Boolean(widgetData.showDeliveryIcon),
        widgetContainer: widgetData.widgetContainer || "none",
        widgetAlignment: widgetData.widgetAlignment || "left",
        widgetIcon: widgetData.widgetIcon || "van",
        widgetAccentColor: widgetData.widgetAccentColor || "#1A5D38",
      },
    });
    return data({ success: true });
  }

  return data({ error: "Invalid payload" });
}

export default function Customization() {
  const { shopData, productData } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [widgetData, setWidgetData] = useState({
    dateFormat: shopData?.dateFormat || "range",
    dateStyle: shopData?.dateStyle || "full",
    mainLine: shopData?.mainLine || "Get it {date}",
    supportingLine: shopData?.supportingLine || "Dispatched from Kolkata",
    fallbackText: shopData?.fallbackText || "Enter your postcode for a delivery date",
    showCutoffCountdown: shopData?.showCutoffCountdown !== false,
    showBreakdown: shopData?.showBreakdown !== false,
    showDeliveryIcon: shopData?.showDeliveryIcon !== false,
    widgetContainer: shopData?.widgetContainer || "none",
    widgetAlignment: shopData?.widgetAlignment || "left",
    widgetIcon: shopData?.widgetIcon || "van",
    widgetAccentColor: shopData?.widgetAccentColor || "#1A5D38",
  });

  const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Saved");
    }
  }, [fetcher.data, shopify]);

  const updateField = (field, value) => {
    setWidgetData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const payload = { intent: "save", widgetData };
    fetcher.submit(payload, {
      method: "POST",
      encType: "application/json",
    });
  };

  return (
    <div className="wd-page">
      {/* Header */}
      <div className="wd-header">
        <div>
          <h1 className="wd-title">Widget design</h1>
          <p className="wd-subtitle">
            What the delivery block says on the product page, and how it looks.
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

      {/* 2-Column Grid Layout */}
      <div className="wd-grid">
        {/* Left Column: Configuration Cards */}
        <div>
          <DateFormatCard
            dateFormat={widgetData.dateFormat}
            dateStyle={widgetData.dateStyle}
            onUpdateField={updateField}
          />

          <WordingCard
            mainLine={widgetData.mainLine}
            supportingLine={widgetData.supportingLine}
            fallbackText={widgetData.fallbackText}
            onUpdateField={updateField}
          />

          <ElementsToggleCard
            showCutoffCountdown={widgetData.showCutoffCountdown}
            showBreakdown={widgetData.showBreakdown}
            showDeliveryIcon={widgetData.showDeliveryIcon}
            onUpdateField={updateField}
          />

          <AppearanceCard
            widgetContainer={widgetData.widgetContainer}
            widgetAlignment={widgetData.widgetAlignment}
            widgetIcon={widgetData.widgetIcon}
            widgetAccentColor={widgetData.widgetAccentColor}
            onUpdateField={updateField}
          />
        </div>

        {/* Right Column: Sticky Live Preview */}
        <div style={{ position: "sticky", top: "20px", alignSelf: "flex-start" }}>
          <LiveWidgetPreview
            widgetData={widgetData}
            shopData={shopData}
            products={productData}
          />
        </div>
      </div>
    </div>
  );
}