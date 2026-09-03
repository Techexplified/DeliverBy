import React, { useState, useEffect } from "react";
import { data, useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import RulesListCard from "../components/Rules/RulesListCard";
import ProductCatchesCard from "../components/Rules/ProductCatchesCard";
import RuleModal from "../components/Rules/RuleModal";
import "../styles/rules.css";

export const DEFAULT_RULES = [
  {
    matchField: "type",
    matchOperator: "is",
    matchValue: "Made to order",
    behaviour: "estimate",
    procMin: 14,
    procMax: 21,
    isEnabled: true,
  },
  {
    matchField: "tag",
    matchOperator: "is",
    matchValue: "preorder",
    behaviour: "merchant",
    procMin: 0,
    procMax: 0,
    isEnabled: true,
  },
  {
    matchField: "type",
    matchOperator: "is",
    matchValue: "Digital",
    behaviour: "hide",
    procMin: 0,
    procMax: 0,
    isEnabled: true,
  },
];

export async function loader({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const shopName = session.shop;

  const [shopData, productResponse] = await Promise.all([
    db.shop.findUnique({
      where: { shop: shopName },
      include: {
        rules: {
          orderBy: { priorityOrder: "asc" },
        },
      },
    }),
    admin.graphql(`
      query getProducts {
        shop {
          currencyCode
        }
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
  const currencyCode = productJson?.data?.shop?.currencyCode || "USD";
  const productData = productJson?.data?.products?.nodes || [];

  return data({ shopData, productData, currencyCode });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shopName = session.shop;

  const payload = await request.json();
  const { intent, rules } = payload;

  if (intent === "save") {
    await db.$transaction(async (tx) => {
      const shop = await tx.shop.findUnique({
        where: { shop: shopName },
        select: { id: true },
      });

      if (!shop) return;

      await tx.productRule.deleteMany({
        where: { shopId: shop.id },
      });

      if (rules && rules.length > 0) {
        await tx.productRule.createMany({
          data: rules.map((rule, idx) => ({
            shopId: shop.id,
            priorityOrder: idx,
            matchField: rule.matchField,
            matchOperator: rule.matchOperator,
            matchValue: rule.matchValue,
            behaviour: rule.behaviour,
            procMin: Number(rule.procMin) || 0,
            procMax: Number(rule.procMax) || 0,
            isEnabled: rule.isEnabled !== false,
          })),
        });
      }
    });

    return data({ success: true });
  }

  return data({ success: false });
}

/**
 * Checks whether a single product satisfies a rule condition
 */
export function doesProductMatchRule(product, rule) {
  if (!product || !rule || !rule.matchValue) return false;
  const targetVal = String(rule.matchValue).toLowerCase().trim();
  const operator = rule.matchOperator || "is";

  switch (rule.matchField) {
    case "type": {
      const type = String(product.productType || "").toLowerCase().trim();
      return operator === "is" ? type === targetVal : type.includes(targetVal);
    }
    case "tag": {
      const tags = Array.isArray(product.tags)
        ? product.tags
        : String(product.tags || "")
            .split(",")
            .map((t) => t.trim().toLowerCase());
      return operator === "is"
        ? tags.some((t) => t.toLowerCase() === targetVal)
        : tags.some((t) => t.toLowerCase().includes(targetVal));
    }
    case "title": {
      const title = String(product.title || "").toLowerCase().trim();
      return operator === "is" ? title === targetVal : title.includes(targetVal);
    }
    case "vendor": {
      const vendor = String(product.vendor || "").toLowerCase().trim();
      return operator === "is" ? vendor === targetVal : vendor.includes(targetVal);
    }
    default:
      return false;
  }
}

export default function RulesPage() {
  const { shopData, productData, currencyCode } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [formData, setFormData] = useState({
    rules: shopData?.rules && shopData.rules.length > 0 ? shopData.rules : DEFAULT_RULES,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Saved");
    }
  }, [fetcher.data, shopify]);

  const handleSave = () => {
    fetcher.submit(
      {
        intent: "save",
        rules: formData.rules,
      },
      {
        method: "POST",
        encType: "application/json",
      }
    );
  };

  const handleToggleRuleStatus = (index) => {
    setFormData((prev) => {
      const updated = [...prev.rules];
      updated[index] = {
        ...updated[index],
        isEnabled: !updated[index].isEnabled,
      };
      return { ...prev, rules: updated };
    });
  };

  const handleReorderRule = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= formData.rules.length) return;

    setFormData((prev) => {
      const updated = [...prev.rules];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return { ...prev, rules: updated };
    });
  };

  const handleOpenAddModal = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule, index) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleRemoveRule = (index) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, idx) => idx !== index),
    }));
  };

  const handleSaveRuleModal = (savedRule) => {
    setFormData((prev) => {
      const updated = [...prev.rules];
      const existingIndex = updated.findIndex((r) => r.id === savedRule.id);

      if (existingIndex >= 0) {
        updated[existingIndex] = savedRule;
      } else {
        updated.push(savedRule);
      }

      return { ...prev, rules: updated };
    });
  };

  return (
    <div className="rules-page">
      {/* Header */}
      <div className="rules-header">
        <div>
          <h1 className="rules-title">Product rules</h1>
          <p className="rules-subtitle">
            Products that shouldn't follow your store default — made to order, pre-orders, anything digital.
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

      {/* Section 1: Rules Table with Reordering & Toggles */}
      <RulesListCard
        rules={formData.rules}
        products={productData}
        storeProcMin={shopData?.procMin}
        storeProcMax={shopData?.procMax}
        onOpenAddModal={handleOpenAddModal}
        onOpenEditModal={handleOpenEditModal}
        onRemoveRule={handleRemoveRule}
        onToggleRuleStatus={handleToggleRuleStatus}
        onReorderRule={handleReorderRule}
      />

      {/* Section 2: Which Products Each Rule Catches Preview */}
      <ProductCatchesCard
        products={productData}
        rules={formData.rules}
        storeProcMin={shopData?.procMin}
        storeProcMax={shopData?.procMax}
        oosEnabled={shopData?.oosEnabled}
        oosDays={shopData?.oosDays}
        currencyCode={currencyCode}
      />

      {/* Modal Dialog */}
      <RuleModal
        isOpen={isModalOpen}
        editingRule={editingRule}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRuleModal}
      />
    </div>
  );
}