package com.buildflow.africa.common;

import java.util.List;
import org.springframework.data.domain.Page;
import java.util.function.Function;

/** List envelope shared by every collection endpoint. */
public record PageResponse<T>(List<T> rows, long total, int page, int size, int pages) {

  public static <E, V> PageResponse<V> of(Page<E> page, Function<E, V> mapper) {
    return new PageResponse<>(
        page.getContent().stream().map(mapper).toList(),
        page.getTotalElements(),
        page.getNumber() + 1,
        page.getSize(),
        Math.max(page.getTotalPages(), 1));
  }
}
