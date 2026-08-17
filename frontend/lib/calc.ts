import type { Estimate, EstimateItem } from "./types";

const round = (n: number) => Math.round(n * 100) / 100;

/** Quantities carry four decimals; binary floating point noise is removed at every boundary. */
const roundQuantity = (n: number) => Math.round(n * 10000) / 10000;

/** Quantity after waste allowance. */
export function adjustedQuantity(item: Pick<EstimateItem, "quantity" | "waste">) {
  return roundQuantity(item.quantity * (1 + item.waste / 100));
}

/** Cost of a line before markup. */
export function lineCost(item: Pick<EstimateItem, "quantity" | "waste" | "rate">) {
  return round(adjustedQuantity(item) * item.rate);
}

/** Sell value of a line, i.e. cost plus its markup. */
export function lineTotal(item: Pick<EstimateItem, "quantity" | "waste" | "rate" | "markup">) {
  return round(lineCost(item) * (1 + item.markup / 100));
}

export type EstimateTotals = ReturnType<typeof estimateTotals>;

/**
 * Deterministic estimate arithmetic. This is the single source of truth for the UI; the backend
 * performs the identical calculation before anything is persisted or issued to a client.
 *
 *   direct cost = materials + labour + equipment + subcontractors (each waste-adjusted)
 *   subtotal    = marked-up lines + overhead + contingency − discount
 *   total       = subtotal + tax
 */
export function estimateTotals(estimate: Estimate) {
  let materialsCost = 0;
  let labourCost = 0;
  let equipmentCost = 0;
  let subcontractCost = 0;
  let markedUp = 0;

  for (const section of estimate.sections) {
    for (const item of section.items) {
      const cost = lineCost(item);
      if (item.kind === "MATERIAL") materialsCost += cost;
      else if (item.kind === "LABOUR") labourCost += cost;
      else if (item.kind === "EQUIPMENT") equipmentCost += cost;
      else subcontractCost += cost;
      markedUp += lineTotal(item);
    }
  }

  const directCost = materialsCost + labourCost + equipmentCost + subcontractCost;
  const overhead = directCost * (estimate.overheadPct / 100);
  const contingency = directCost * (estimate.contingencyPct / 100);
  const subtotal = markedUp + overhead + contingency - estimate.discount;
  const tax = subtotal * (estimate.taxPct / 100);
  const total = subtotal + tax;
  const grossProfit = subtotal - directCost;

  return {
    materialsCost: round(materialsCost),
    labourCost: round(labourCost),
    equipmentCost: round(equipmentCost),
    subcontractCost: round(subcontractCost),
    directCost: round(directCost),
    overhead: round(overhead),
    contingency: round(contingency),
    profit: round(markedUp - directCost),
    discount: estimate.discount,
    subtotal: round(subtotal),
    tax: round(tax),
    total: round(total),
    grossProfit: round(grossProfit),
    grossMargin: subtotal ? round((grossProfit / subtotal) * 100) : 0
  };
}

/** Non-destructive review checks. Nothing here modifies the estimate. */
export function reviewEstimate(estimate: Estimate, materialAgeDays: Record<string, number> = {}) {
  const issues: { id: string; severity: "high" | "medium" | "low"; title: string; detail: string }[] = [];
  const items = estimate.sections.flatMap((s) => s.items);
  const has = (re: RegExp) => items.some((i) => re.test(i.description.toLowerCase()) || re.test(i.category.toLowerCase()));
  const totals = estimateTotals(estimate);

  if (has(/roof/) && !items.some((i) => i.kind === "LABOUR" && /roof/.test(i.description.toLowerCase()))) {
    issues.push({ id: "roof-labour", severity: "high", title: "Roofing labour is missing", detail: "Roofing materials are priced but no roofing labour line was found." });
  }
  if (!has(/transport|haul|cartage|trip/)) {
    issues.push({ id: "transport", severity: "high", title: "No transport cost has been included", detail: "Deliveries to site are usually a material cost driver in Ghana." });
  }
  const zeroWaste = items.filter((i) => i.kind === "MATERIAL" && i.waste === 0);
  if (zeroWaste.length) {
    issues.push({ id: "waste", severity: "medium", title: `${zeroWaste.length} material lines have 0% waste allowance`, detail: "Tiles, blocks and cement normally carry a 5–10% allowance for cutting and breakage." });
  }
  if (!has(/scaffold/) && has(/plaster|paint|roof/)) {
    issues.push({ id: "scaffold", severity: "low", title: "Scaffolding is not priced", detail: "Work at height is included but no scaffolding or access equipment appears in the estimate." });
  }
  if (estimate.contingencyPct === 0) {
    issues.push({ id: "contingency", severity: "medium", title: "No contingency has been applied", detail: "A contingency of 3–5% absorbs small scope changes without eroding profit." });
  }
  if (totals.grossMargin < 12) {
    issues.push({ id: "margin", severity: "high", title: `Gross margin is only ${totals.grossMargin.toFixed(1)}%`, detail: "Check markups, overhead recovery and any discount before this is issued." });
  }
  for (const [name, age] of Object.entries(materialAgeDays)) {
    if (age > 60) {
      issues.push({ id: `stale-${name}`, severity: "medium", title: `${name} rate is ${Math.round(age)} days old`, detail: "Review the price before issuing the quotation." });
    }
  }
  return issues;
}
