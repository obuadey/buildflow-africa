package com.buildflow.africa.rates;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One load of reference data, kept so any rate can be traced back to the document it came from. */
@Entity
@Table(name = "reference_price_imports")
public class ReferencePriceImport {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(nullable = false) private String source;
  @Column(name = "file_name") private String fileName;
  @Column(nullable = false) private String country = "Ghana";
  private String region;
  @Column(name = "effective_date", nullable = false) private LocalDate effectiveDate = LocalDate.now();
  @Column(name = "rows_imported", nullable = false) private int rowsImported;
  @Column(name = "rows_rejected", nullable = false) private int rowsRejected;
  @Column(name = "imported_by") private String importedBy;
  private String notes;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  @Column(name = "updated_at") private Instant updatedAt;

  public UUID getId() { return id; }
  public String getSource() { return source; }
  public void setSource(String source) { this.source = source; }
  public String getFileName() { return fileName; }
  public void setFileName(String fileName) { this.fileName = fileName; }
  public String getCountry() { return country; }
  public void setCountry(String country) { this.country = country; }
  public String getRegion() { return region; }
  public void setRegion(String region) { this.region = region; }
  public LocalDate getEffectiveDate() { return effectiveDate; }
  public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
  public int getRowsImported() { return rowsImported; }
  public void setRowsImported(int rowsImported) { this.rowsImported = rowsImported; }
  public int getRowsRejected() { return rowsRejected; }
  public void setRowsRejected(int rowsRejected) { this.rowsRejected = rowsRejected; }
  public String getImportedBy() { return importedBy; }
  public void setImportedBy(String importedBy) { this.importedBy = importedBy; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public Instant getCreatedAt() { return createdAt; }
}
