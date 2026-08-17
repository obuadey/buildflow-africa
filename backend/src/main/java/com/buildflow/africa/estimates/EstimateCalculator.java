package com.buildflow.africa.estimates;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

/**
 * The money. Every figure a contractor sees, quotes and invoices comes from here, so the arithmetic
 * is defined once and done in {@link BigDecimal} throughout.
 *
 * <pre>
 *   adjusted quantity = quantity × (1 + waste%)
 *   line cost         = adjusted quantity × unit cost + labour + equipment + subcontractor
 *   line total        = line cost × (1 + markup%)
 *   direct cost       = Σ line cost                      (what the job costs to build)
 *   overhead          = direct cost × overhead%
 *   contingency       = direct cost × contingency%
 *   subtotal          = Σ line total + overhead + contingency − discount
 *   tax               = subtotal × tax%
 *   total             = subtotal + tax
 * </pre>
 *
 * Waste lands on the quantity, not the rate, because it is extra material bought. Markup is taken
 * on cost, so a 20% markup is a 16.7% margin — the distinction that decides whether a job pays.
 * The estimate builder in the browser runs the identical sequence, so the figure on screen is the
 * figure that is stored.
 */
@Component
public class EstimateCalculator {
  private static final BigDecimal HUNDRED = new BigDecimal("100");

  /** Computes the totals and writes them onto the estimate, its sections and its lines. */
  public Totals calculate(Estimate estimate) {
    BigDecimal materials = BigDecimal.ZERO;
    BigDecimal labour = BigDecimal.ZERO;
    BigDecimal equipment = BigDecimal.ZERO;
    BigDecimal subcontract = BigDecimal.ZERO;
    BigDecimal markedUp = BigDecimal.ZERO;

    for (EstimateSection section : estimate.getSections()) {
      BigDecimal sectionTotal = BigDecimal.ZERO;
      for (EstimateItem item : section.getItems()) {
        BigDecimal adjustedQuantity =
            orZero(item.getQuantity()).multiply(BigDecimal.ONE.add(percent(item.getWastePercent())));
        BigDecimal lineCost = money(adjustedQuantity.multiply(orZero(item.getUnitCost()))
            .add(orZero(item.getLabourCost()))
            .add(orZero(item.getEquipmentCost()))
            .add(orZero(item.getSubcontractorCost())));

        item.setTotal(money(lineCost.multiply(BigDecimal.ONE.add(percent(item.getMarkupPercent())))));
        markedUp = markedUp.add(item.getTotal());
        sectionTotal = sectionTotal.add(item.getTotal());

        switch (item.getCostType() == null ? "MATERIAL" : item.getCostType()) {
          case "LABOUR" -> labour = labour.add(lineCost);
          case "EQUIPMENT" -> equipment = equipment.add(lineCost);
          case "SUBCONTRACTOR" -> subcontract = subcontract.add(lineCost);
          default -> materials = materials.add(lineCost);
        }
      }
      section.setSubtotal(money(sectionTotal));
    }

    BigDecimal directCost = materials.add(labour).add(equipment).add(subcontract);
    BigDecimal overhead = directCost.multiply(percent(estimate.getOverheadPercent()));
    BigDecimal contingency = directCost.multiply(percent(estimate.getContingencyPercent()));
    BigDecimal discount = orZero(estimate.getDiscountAmount());
    BigDecimal subtotal = markedUp.add(overhead).add(contingency).subtract(discount);
    BigDecimal tax = subtotal.multiply(percent(estimate.getTaxPercent()));
    BigDecimal grossProfit = subtotal.subtract(directCost);

    estimate.setDirectCost(money(directCost));
    estimate.setOverheadAmount(money(overhead));
    estimate.setContingencyAmount(money(contingency));
    // What the markup on the lines recovers above cost. Overhead and contingency are held
    // separately, so this is the margin the markup itself earns.
    estimate.setProfitAmount(money(markedUp.subtract(directCost)));
    estimate.setTaxAmount(money(tax));
    estimate.setTotalAmount(money(subtotal.add(tax)));

    return new Totals(
        money(materials), money(labour), money(equipment), money(subcontract), money(directCost),
        money(overhead), money(contingency), money(markedUp.subtract(directCost)), money(discount),
        money(subtotal), money(tax), money(subtotal.add(tax)), money(grossProfit),
        subtotal.compareTo(BigDecimal.ZERO) == 0
            ? BigDecimal.ZERO
            : grossProfit.multiply(HUNDRED).divide(subtotal, 1, RoundingMode.HALF_UP));
  }

  private BigDecimal percent(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value.divide(HUNDRED, 8, RoundingMode.HALF_UP);
  }

  private BigDecimal orZero(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private BigDecimal money(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  /** The full breakdown, matching the summary panel in the estimate builder field for field. */
  public record Totals(
      BigDecimal materialsCost, BigDecimal labourCost, BigDecimal equipmentCost,
      BigDecimal subcontractCost, BigDecimal directCost, BigDecimal overhead, BigDecimal contingency,
      BigDecimal profit, BigDecimal discount, BigDecimal subtotal, BigDecimal tax, BigDecimal total,
      BigDecimal grossProfit, BigDecimal grossMargin) {}
}
