// app/libs/test/scenarios.js
import { format, nextSunday, nextFriday, addDays } from "date-fns";

/**
 * Clean mock products dataset used across the DeliverBy Preview & Test Simulator.
 * Provides predictable test fixtures for standard products, out-of-stock items,
 * custom rules (Made-to-order, Pre-order), and digital gift cards.
 */
export const MOCK_PRODUCTS = [
  {
    id: "mock-tee",
    title: "Heavy Cotton Crew Tee",
    price: "2400.00",
    productType: "Apparel",
    tags: ["T-Shirt", "Cotton"],
    vendor: "DeliverBy Apparel",
    stock: 25,
    inventoryQuantity: 25,
    totalInventory: 25,
    variants: [{ nodes: [{ price: "2400.00" }] }],
  },
  {
    id: "mock-tee-oos",
    title: "Heavy Cotton Crew Tee (Out of Stock)",
    price: "2400.00",
    productType: "Apparel",
    tags: ["T-Shirt", "Cotton"],
    vendor: "DeliverBy Apparel",
    stock: 0,
    inventoryQuantity: 0,
    totalInventory: 0,
    variants: [{ nodes: [{ price: "2400.00" }] }],
  },
  {
    id: "mock-furniture",
    title: "Handcrafted Oak Dining Table",
    price: "45000.00",
    productType: "Furniture",
    tags: ["Made to order", "Custom"],
    vendor: "Artisan Studio",
    procMin: 14,
    procMax: 21,
    stock: 5,
    inventoryQuantity: 5,
    totalInventory: 5,
    variants: [{ nodes: [{ price: "45000.00" }] }],
  },
  {
    id: "mock-preorder",
    title: "Winter Drop Heavyweight Hoodie",
    price: "3200.00",
    productType: "Apparel",
    tags: ["Pre-order", "Winter Drop"],
    vendor: "DeliverBy Apparel",
    merchantDate: "2026-11-20",
    behaviour: "merchant",
    stock: 10,
    inventoryQuantity: 10,
    totalInventory: 10,
    variants: [{ nodes: [{ price: "3200.00" }] }],
  },
  {
    id: "mock-digital",
    title: "Digital Store Gift Card",
    price: "5000.00",
    productType: "Gift Cards",
    tags: ["Digital", "Gift Card"],
    vendor: "DeliverBy Store",
    behaviour: "hide",
    stock: 999,
    inventoryQuantity: 999,
    totalInventory: 999,
    variants: [{ nodes: [{ price: "5000.00" }] }],
  },
];

/**
 * Generates 14 relative scenario presets based on current date, store cut-off time,
 * and home country. Keeps test scenarios perpetually fresh and realistic.
 */
export function getSavedScenarios(
  baseDate = new Date(),
  cutoffTime = "14:00",
  homeCountry = "IN"
) {
  const todayStr = format(baseDate, "yyyy-MM-dd");
  const thisSunday = format(nextSunday(baseDate), "yyyy-MM-dd");
  const thisFriday = format(nextFriday(baseDate), "yyyy-MM-dd");
  const currentYear = baseDate.getFullYear();
  const peakDecDate = `${currentYear}-12-08`;

  // Cut-off + 40 mins (e.g. 14:00 -> 14:40)
  const [cutH = 14] = String(cutoffTime).split(":").map(Number);
  const cutoffOverTime = `${String(cutH).padStart(2, "0")}:40`;

  return [
    {
      id: 1,
      number: "01",
      title: "Ordered after the cut-off",
      subtitle: `${cutoffOverTime} on an ordinary weekday`,
      badge: "Cut-off",
      orderDate: todayStr,
      orderTime: cutoffOverTime,
      country: homeCountry,
      deliveryMethod: "shipping",
      productId: "mock-tee",
      explanation:
        "When an order arrives past the cut-off time, the warehouse clock does not start until the next working day morning.",
    },
    {
      id: 2,
      number: "02",
      title: "Ordered on a closed day",
      subtitle: "Sunday morning, warehouse shut",
      badge: "Closure",
      orderDate: thisSunday,
      orderTime: "10:30",
      country: homeCountry,
      deliveryMethod: "shipping",
      productId: "mock-tee",
      explanation:
        "Orders placed on a weekend or closed day don't count towards dispatch. The packing clock starts on your next open working day.",
    },
    {
      id: 3,
      number: "03",
      title: "Ordered the day before a closure",
      subtitle: "Warehouse shuts tomorrow",
      badge: "Closure",
      orderDate: todayStr,
      orderTime: "11:00",
      country: homeCountry,
      deliveryMethod: "shipping",
      productId: "mock-tee",
      mockClosures: [
        {
          date: format(addDays(baseDate, 1), "yyyy-MM-dd"),
          reason: "Warehouse Maintenance Shutdown",
        },
      ],
      explanation:
        "When an order is placed right before a scheduled shutdown, dispatch and carrier transit skip all closed days seamlessly.",
    },
    {
      id: 4,
      number: "04",
      title: "Product is out of stock",
      subtitle: "Backordered but still purchasable",
      badge: "Stock",
      orderDate: todayStr,
      orderTime: "11:00",
      country: homeCountry,
      deliveryMethod: "shipping",
      productId: "mock-tee-oos",
      explanation:
        "When inventory drops to 0 and backorders are allowed, your Out-of-Stock buffer days are automatically added to the dispatch timeline.",
    },
    {
      id: 5,
      number: "05",
      title: "Made to order",
      subtitle: "Furniture built after the sale",
      badge: "Rule",
      orderDate: todayStr,
      orderTime: "11:00",
      country: homeCountry,
      deliveryMethod: "shipping",
      productId: "mock-furniture",
      explanation:
        "Matched by your custom product rules. Custom lead time overrides standard processing times to give accurate build + dispatch estimates.",
    },
    {
      id: 6,
      number: "06",
      title: "A month in transit",
      subtitle: "Made to order, shipping to Australia",
      badge: "Zone",
      orderDate: todayStr,
      orderTime: "11:00",
      country: "AU",
      deliveryMethod: "shipping",
      productId: "mock-furniture",
      explanation:
        "Combines custom production lead times with long international transit zones, keeping customer expectations clear from day one.",
    },
    {
      id: 7,
      number: "07",
      title: "Pre-order with your own date",
      subtitle: "Winter drop, charged today",
      badge: "Pre-order",
      orderDate: todayStr,
      orderTime: "11:00",
      country: homeCountry,
      deliveryMethod: "shipping",
      productId: "mock-preorder",
      explanation:
        "Displays a fixed merchant-defined shipping date rather than dynamic calculation, ideal for seasonal drops and upcoming collections.",
    },
    {
      id: 8,
      number: "08",
      title: "Digital product",
      subtitle: "Gift card, nothing ships",
      badge: "Rule",
      orderDate: todayStr,
      orderTime: "11:00",
      country: homeCountry,
      deliveryMethod: "shipping",
      productId: "mock-digital",
      explanation:
        "Digital items and gift cards match a 'Hide widget' rule, preventing delivery estimates from showing on non-physical goods.",
    },
    {
      id: 9,
      number: "09",
      title: "Shopper's location unknown",
      subtitle: "VPN, privacy mode, or a bot",
      badge: "Fallback",
      orderDate: todayStr,
      orderTime: "11:00",
      country: "UNKNOWN",
      deliveryMethod: "shipping",
      productId: "mock-tee",
      explanation:
        "When IP geolocation cannot resolve a country, the fallback mechanism displays your store's fallback estimate or prompts for postal code.",
    },
    {
      id: 10,
      number: "10",
      title: "Country outside your named zones",
      subtitle: "An order from Brazil",
      badge: "Zone",
      orderDate: todayStr,
      orderTime: "11:00",
      country: "BR",
      deliveryMethod: "shipping",
      productId: "mock-tee",
      explanation:
        "When a shopper is in a country not listed in your named delivery zones, the fallback Rest of World zone transit times automatically apply.",
    },
    {
      id: 11,
      number: "11",
      title: "Ordered on a Friday",
      subtitle: "Standard service to the US",
      badge: "Carrier",
      orderDate: thisFriday,
      orderTime: "11:00",
      country: "US",
      deliveryMethod: "shipping",
      productId: "mock-tee",
      explanation:
        "Orders dispatched heading into the weekend account for carrier non-operating days (Saturday & Sunday) during transit calculation.",
    },
    {
      id: 12,
      number: "12",
      title: "Peak season",
      subtitle: "The same order, placed in December",
      badge: "Buffer",
      orderDate: peakDecDate,
      orderTime: "12:10",
      country: "US",
      deliveryMethod: "shipping",
      productId: "mock-tee",
      forcePeakSeason: true,
      explanation:
        "Inside your peak window the whole transit range widens. It's the difference between a January of apologies and a January of nothing.",
    },
    {
      id: 13,
      number: "13",
      title: "Ten minutes to midnight",
      subtitle: "23:50, cut-off long gone",
      badge: "Cut-off",
      orderDate: todayStr,
      orderTime: "23:50",
      country: homeCountry,
      deliveryMethod: "shipping",
      productId: "mock-tee",
      explanation:
        "Late-night orders placed just before midnight are evaluated against tomorrow's fulfillment schedule rather than today's.",
    },
    {
      id: 14,
      number: "14",
      title: "Shopper in another timezone",
      subtitle: "New York afternoon, local night",
      badge: "Timezone",
      orderDate: todayStr,
      orderTime: "22:30",
      country: "US",
      deliveryMethod: "shipping",
      productId: "mock-tee",
      explanation:
        "Shows the difference between shopper local time and warehouse local time so merchants understand when the order actually enters fulfillment.",
    },
  ];
}

export const SAVED_SCENARIOS = getSavedScenarios();
