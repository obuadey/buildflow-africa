package com.buildflow.africa.invoices;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Invoice status is derived, never accepted from a client. */
class InvoiceStatusTest {

  private final InvoiceService service = new InvoiceService(null, null, null, null);

  private Invoice invoice(String total, String paid, LocalDate due, String status) {
    Invoice invoice = new Invoice();
    invoice.setTotalAmount(new BigDecimal(total));
    invoice.setPaidAmount(new BigDecimal(paid));
    invoice.setDueDate(due);
    invoice.setStatus(status);
    return invoice;
  }

  @Test
  @DisplayName("fully paid invoices become PAID regardless of the due date")
  void paid() {
    Invoice invoice = invoice("1000", "1000", LocalDate.now().minusDays(30), "SENT");
    assertEquals("PAID", service.applyStatus(invoice).getStatus());
  }

  @Test
  @DisplayName("a part payment before the due date is PARTIALLY_PAID")
  void partiallyPaid() {
    Invoice invoice = invoice("1000", "400", LocalDate.now().plusDays(7), "SENT");
    assertEquals("PARTIALLY_PAID", service.applyStatus(invoice).getStatus());
  }

  @Test
  @DisplayName("a part payment after the due date is OVERDUE")
  void partiallyPaidOverdue() {
    Invoice invoice = invoice("1000", "400", LocalDate.now().minusDays(1), "SENT");
    assertEquals("OVERDUE", service.applyStatus(invoice).getStatus());
  }

  @Test
  @DisplayName("an unpaid invoice past its due date is OVERDUE")
  void overdue() {
    Invoice invoice = invoice("1000", "0", LocalDate.now().minusDays(3), "SENT");
    assertEquals("OVERDUE", service.applyStatus(invoice).getStatus());
  }

  @Test
  @DisplayName("drafts and cancellations are never reclassified")
  void draftUntouched() {
    assertEquals("DRAFT", service.applyStatus(invoice("1000", "0", LocalDate.now().minusDays(5), "DRAFT")).getStatus());
    assertEquals("CANCELLED",
        service.applyStatus(invoice("1000", "0", LocalDate.now().minusDays(5), "CANCELLED")).getStatus());
  }

  @Test
  @DisplayName("outstanding is total less paid")
  void outstanding() {
    assertEquals(new BigDecimal("600"), invoice("1000", "400", LocalDate.now(), "SENT").outstanding());
  }
}
