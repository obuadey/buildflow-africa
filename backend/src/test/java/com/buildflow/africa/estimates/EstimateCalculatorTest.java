package com.buildflow.africa.estimates;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class EstimateCalculatorTest {
  private final EstimateCalculator calculator = new EstimateCalculator();

  @Test
  void appliesWasteToQuantityThenMarkupOverheadContingencyAndTax() {
    Estimate estimate = estimate("5", "2", "3", "100");

    EstimateItem item = item(estimate, "MATERIAL", "100", "10", "10", "15");
    item.setLabourCost(new BigDecimal("200"));

    calculator.calculate(estimate);

    // 100 × 1.10 × 10 + 200 = 1300 cost, × 1.15 = 1495 sell
    assertThat(item.getTotal()).isEqualByComparingTo("1495.00");
    assertThat(estimate.getDirectCost()).isEqualByComparingTo("1300.00");
    assertThat(estimate.getOverheadAmount()).isEqualByComparingTo("65.00");
    assertThat(estimate.getContingencyAmount()).isEqualByComparingTo("26.00");
    assertThat(estimate.getProfitAmount()).isEqualByComparingTo("195.00");
    // 1495 + 65 + 26 − 100 = 1486 subtotal, tax 44.58
    assertThat(estimate.getTaxAmount()).isEqualByComparingTo("44.58");
    assertThat(estimate.getTotalAmount()).isEqualByComparingTo("1530.58");
  }

  @Test
  void markupOfTwentyPercentIsAMarginOfSixteenPointSeven() {
    Estimate estimate = estimate("0", "0", "0", "0");
    item(estimate, "MATERIAL", "1", "400000", "0", "20");

    calculator.calculate(estimate);

    assertThat(estimate.getDirectCost()).isEqualByComparingTo("400000.00");
    assertThat(estimate.getTotalAmount()).isEqualByComparingTo("480000.00");
  }

  @Test
  void taxIsChargedOnTheSubtotalAfterDiscount() {
    Estimate estimate = estimate("0", "0", "15", "100");
    item(estimate, "MATERIAL", "1", "1000", "0", "0");

    calculator.calculate(estimate);

    assertThat(estimate.getTaxAmount()).isEqualByComparingTo("135.00");
    assertThat(estimate.getTotalAmount()).isEqualByComparingTo("1035.00");
  }

  @Test
  void anEmptyEstimateTotalsToZeroRatherThanFailing() {
    Estimate estimate = estimate("8", "3", "15", "0");

    calculator.calculate(estimate);

    assertThat(estimate.getDirectCost()).isEqualByComparingTo("0.00");
    assertThat(estimate.getTotalAmount()).isEqualByComparingTo("0.00");
  }

  private Estimate estimate(String overhead, String contingency, String tax, String discount) {
    Estimate estimate = new Estimate();
    estimate.setOverheadPercent(new BigDecimal(overhead));
    estimate.setContingencyPercent(new BigDecimal(contingency));
    estimate.setTaxPercent(new BigDecimal(tax));
    estimate.setDiscountAmount(new BigDecimal(discount));
    return estimate;
  }

  private EstimateItem item(Estimate estimate, String costType, String quantity, String unitCost,
                            String waste, String markup) {
    EstimateSection section = estimate.getSections().stream().findFirst().orElseGet(() -> {
      EstimateSection created = new EstimateSection();
      created.setEstimate(estimate);
      created.setName("Section");
      estimate.getSections().add(created);
      return created;
    });

    EstimateItem item = new EstimateItem();
    item.setSection(section);
    item.setEstimate(estimate);
    item.setDescription("Line");
    item.setCostType(costType);
    item.setUnit("item");
    item.setQuantity(new BigDecimal(quantity));
    item.setUnitCost(new BigDecimal(unitCost));
    item.setWastePercent(new BigDecimal(waste));
    item.setMarkupPercent(new BigDecimal(markup));
    section.getItems().add(item);
    return item;
  }
}
