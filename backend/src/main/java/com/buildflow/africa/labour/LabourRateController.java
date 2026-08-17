package com.buildflow.africa.labour;

import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/labour")
public class LabourRateController {

  private static final List<String> SEARCHABLE = List.of("trade", "region", "unit");
  private static final Map<String, String> FILTERS = Map.of("region", "region", "unit", "unit");

  private final LabourRateRepository repository;

  public LabourRateController(LabourRateRepository repository) {
    this.repository = repository;
  }

  @GetMapping
  public PageResponse<LabourView> list(@RequestParam Map<String, String> params) {
    return PageResponse.of(repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "effectiveDate"),
        ListQuery.pageable(params, "trade")), LabourView::from);
  }

  @PostMapping
  public LabourView create(@Valid @RequestBody LabourRequest request) {
    LabourRate rate = new LabourRate();
    rate.setTenantId(TenantContext.getRequired());
    apply(rate, request);
    return LabourView.from(repository.save(rate));
  }

  @PatchMapping("/{id}")
  public LabourView update(@PathVariable("id") UUID id, @RequestBody LabourRequest request) {
    LabourRate rate = repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("LABOUR_RATE_NOT_FOUND", "That labour rate no longer exists."));
    apply(rate, request);
    return LabourView.from(repository.save(rate));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    LabourRate rate = repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("LABOUR_RATE_NOT_FOUND", "That labour rate no longer exists."));
    repository.delete(rate);
  }

  private void apply(LabourRate rate, LabourRequest request) {
    if (request.trade() != null) rate.setTrade(request.trade());
    if (request.unit() != null) rate.setUnit(request.unit());
    if (request.rate() != null) rate.setRate(request.rate());
    if (request.region() != null) rate.setRegion(request.region());
    if (request.crewSize() != null) rate.setCrewSize(request.crewSize());
    if (request.effectiveDate() != null) rate.setEffectiveDate(request.effectiveDate());
    if (request.active() != null) rate.setActive(request.active());
  }

  public record LabourRequest(@NotBlank String trade, String unit, BigDecimal rate, String region,
                              Integer crewSize, LocalDate effectiveDate, Boolean active) {}

  public record LabourView(UUID id, String trade, String unit, BigDecimal rate, String region,
                           int crewSize, LocalDate effectiveDate, Instant updatedAt) {
    static LabourView from(LabourRate r) {
      return new LabourView(r.getId(), r.getTrade(), r.getUnit(), r.getRate(), r.getRegion(),
          r.getCrewSize(), r.getEffectiveDate(), r.getUpdatedAt());
    }
  }
}
