import React, { useState } from "react";
import { doesProductMatchRule } from "../../routes/app.rules";

export default function ProductCatchesCard({
  products,
  rules,
  storeProcMin,
  storeProcMax,
  oosEnabled,
  oosDays,
}) {
  const getProductMatch = (product) => {
    // Top-down evaluation: first enabled rule that matches wins!
    const activeRules = (rules || []).filter((r) => r.isEnabled);
    for (const rule of activeRules) {
      if (doesProductMatchRule(product, rule)) {
        return rule;
      }
    }
    return null;
  };

  const formatTypeAndTags = (product) => {
    const parts = [];
    if (product.productType) parts.push(product.productType);
    if (product.tags) {
      const tagsList = Array.isArray(product.tags)
        ? product.tags
        : String(product.tags).split(",").map((t) => t.trim());
      parts.push(...tagsList.filter(Boolean));
    }
    return parts.length > 0 ? parts.join(" · ") : "—";
  };

  const getRuleLabel = (rule) => {
    const fieldMap = {
      type: "Product type",
      tag: "Tag",
      title: "Product title",
      vendor: "Vendor",
    };
    const op = rule.matchOperator === "contains" ? "contains" : "is";
    return `${fieldMap[rule.matchField] || rule.matchField} ${op} ${rule.matchValue}`;
  };

  // Pagination calculation
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalProducts = products?.length || 0;
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedProducts = (products || []).slice(startIndex, endIndex);
  const displayStart = totalProducts === 0 ? 0 : startIndex + 1;
  const displayEnd = Math.min(endIndex, totalProducts);

  return (
    <div className="rules-card">
      <div className="rules-card-header">
        <h3 className="rules-card-title">Which of your products each rule catches</h3>
      </div>

      {totalProducts > 0 ? (
        <>
          <table className="rules-table">
            <thead>
              <tr>
                <th style={{ width: "28%" }}>Product</th>
                <th style={{ width: "28%" }}>Type / tags</th>
                <th style={{ width: "28%" }}>Matched by</th>
                <th style={{ width: "16%" }}>Dispatch</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => {
                const matchedRule = getProductMatch(product);
                const isOos = (product.totalInventory ?? 1) <= 0;

                // Calculate dispatch text
                let dispatchText = "";
                if (matchedRule) {
                  if (matchedRule.behaviour === "estimate") {
                    dispatchText = `${matchedRule.procMin}–${matchedRule.procMax} days`;
                  } else if (matchedRule.behaviour === "merchant") {
                    dispatchText = "Your own date";
                  } else if (matchedRule.behaviour === "hide") {
                    dispatchText = "No block shown";
                  }
                } else {
                  // Store default
                  const extra = isOos && oosEnabled ? Number(oosDays || 0) : 0;
                  const min = Number(storeProcMin || 1) + extra;
                  const max = Number(storeProcMax || 2) + extra;
                  dispatchText = `${min}–${max} days`;
                }

                return (
                  <tr key={product.id}>
                    {/* Product Title + Stock */}
                    <td>
                      <strong style={{ color: "#1a1a1a" }}>{product.title}</strong>
                      <div style={{ fontSize: "11.5px", color: "#616161", marginTop: "2px" }}>
                        {product.totalInventory != null && product.totalInventory > 0
                          ? `${product.totalInventory} in stock`
                          : "Out of stock"}
                      </div>
                    </td>

                    {/* Type / tags */}
                    <td style={{ color: "#616161", fontSize: "12.5px" }}>
                      {formatTypeAndTags(product)}
                    </td>

                    {/* Matched by */}
                    <td>
                      {matchedRule ? (
                        <span className="badge-blue">{getRuleLabel(matchedRule)}</span>
                      ) : (
                        <span className="badge-default">Store default</span>
                      )}
                    </td>

                    {/* Dispatch text */}
                    <td style={{ color: "#303030", fontWeight: 500 }}>{dispatchText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Footer */}
          {totalProducts > PAGE_SIZE && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "14px",
                borderTop: "1px solid #EBEBEB",
                marginTop: "10px",
              }}
            >
              {/* Left: Showing range */}
              <span style={{ fontSize: "12.5px", color: "#616161" }}>
                Showing {displayStart}–{displayEnd} of {totalProducts} products
              </span>

              {/* Right: Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </button>

                <span
                  style={{
                    fontSize: "12px",
                    color: "#303030",
                    fontWeight: 600,
                    padding: "0 4px",
                  }}
                >
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p style={{ color: "#8A8A8A", fontSize: "12.5px", margin: "10px 0 16px" }}>
          No products found in store.
        </p>
      )}
    </div>
  );
}
