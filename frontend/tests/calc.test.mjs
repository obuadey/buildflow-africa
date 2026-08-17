/**
 * Estimate arithmetic — the figures that decide whether a job is profitable.
 * Run with: npm test   (node --test, no external runner needed)
 */
import test from "node:test";
import assert from "node:assert/strict";
import { adjustedQuantity, lineCost, lineTotal, estimateTotals, reviewEstimate } from "../dist-tests/calc.js";

const item = (over = {}) => ({
  id: "i1", description: "Ghacem cement 50kg", category: "Concrete Works", kind: "MATERIAL",
  quantity: 100, unit: "bag", rate: 98, waste: 0, markup: 15, ...over
});

const estimate = (sections, over = {}) => ({
  id: "EST-2026-0001", title: "Test", projectId: "p", projectName: "p", clientId: "c", clientName: "c",
  status: "DRAFT", estimator: "QS", createdAt: "", updatedAt: "",
  overheadPct: 8, contingencyPct: 3, profitPct: 15, taxPct: 0, discount: 0, sections, ...over
});

test("waste is applied to the quantity, not the rate", () => {
  assert.equal(adjustedQuantity(item({ quantity: 100, waste: 10 })), 110);
  assert.equal(lineCost(item({ quantity: 100, waste: 10, rate: 10 })), 1100);
});

test("markup is applied to the waste-adjusted cost", () => {
  assert.equal(lineTotal(item({ quantity: 10, rate: 100, waste: 0, markup: 20 })), 1200);
  assert.equal(lineTotal(item({ quantity: 10, rate: 100, waste: 10, markup: 20 })), 1320);
});

test("cost types are separated in the totals", () => {
  const totals = estimateTotals(estimate([{ id: "s", name: "Foundation", items: [
    item({ kind: "MATERIAL", quantity: 10, rate: 100, markup: 0 }),
    item({ kind: "LABOUR", quantity: 5, rate: 200, markup: 0 }),
    item({ kind: "EQUIPMENT", quantity: 2, rate: 300, markup: 0 }),
    item({ kind: "SUBCONTRACTOR", quantity: 1, rate: 400, markup: 0 })
  ] }]));
  assert.equal(totals.materialsCost, 1000);
  assert.equal(totals.labourCost, 1000);
  assert.equal(totals.equipmentCost, 600);
  assert.equal(totals.subcontractCost, 400);
  assert.equal(totals.directCost, 3000);
});

test("overhead and contingency are recovered before profit", () => {
  const totals = estimateTotals(estimate([{ id: "s", name: "S", items: [
    item({ quantity: 1, rate: 10000, markup: 0 })
  ] }], { overheadPct: 8, contingencyPct: 3 }));
  assert.equal(totals.overhead, 800);
  assert.equal(totals.contingency, 300);
  assert.equal(totals.subtotal, 11100);
});

test("markup of 20% yields a margin of 16.7%, not 20%", () => {
  const totals = estimateTotals(estimate([{ id: "s", name: "S", items: [
    item({ quantity: 1, rate: 400000, markup: 20 })
  ] }], { overheadPct: 0, contingencyPct: 0 }));
  assert.equal(totals.directCost, 400000);
  assert.equal(totals.total, 480000);
  assert.equal(Math.round(totals.grossMargin * 10) / 10, 16.7);
});

test("tax is charged on the subtotal after discount", () => {
  const totals = estimateTotals(estimate([{ id: "s", name: "S", items: [
    item({ quantity: 1, rate: 1000, markup: 0 })
  ] }], { overheadPct: 0, contingencyPct: 0, discount: 100, taxPct: 15 }));
  assert.equal(totals.subtotal, 900);
  assert.equal(totals.tax, 135);
  assert.equal(totals.total, 1035);
});

test("an empty estimate produces zeroes rather than NaN", () => {
  const totals = estimateTotals(estimate([]));
  assert.equal(totals.total, 0);
  assert.equal(totals.grossMargin, 0);
});

test("review flags missing transport, zero waste and thin margin", () => {
  const issues = reviewEstimate(estimate([{ id: "s", name: "Roofing", items: [
    item({ description: "Aluzinc roofing sheet", kind: "MATERIAL", waste: 0, markup: 2 })
  ] }], { contingencyPct: 0 }));
  const ids = issues.map((issue) => issue.id);
  assert.ok(ids.includes("transport"), "transport must be flagged");
  assert.ok(ids.includes("waste"), "zero waste must be flagged");
  assert.ok(ids.includes("contingency"), "missing contingency must be flagged");
  assert.ok(ids.includes("margin"), "thin margin must be flagged");
});

test("review reports a stale material rate", () => {
  const issues = reviewEstimate(estimate([{ id: "s", name: "S", items: [item()] }]),
    { "Ghacem cement 50kg": 82 });
  assert.ok(issues.some((issue) => issue.id.startsWith("stale-")));
});
