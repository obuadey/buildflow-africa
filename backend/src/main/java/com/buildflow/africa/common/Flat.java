package com.buildflow.africa.common;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Detail pages read a record and the things hanging off it as one flat object — an invoice with its
 * payments, a client with its projects. This spreads a view record's fields into a map and adds the
 * related collections beside them, so the shape stays a single record rather than a wrapper the
 * caller has to unpick.
 */
@Component
public class Flat {

  private static final TypeReference<LinkedHashMap<String, Object>> MAP = new TypeReference<>() {};

  private final ObjectMapper mapper;

  public Flat(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  public Map<String, Object> of(Object view, Map<String, Object> related) {
    LinkedHashMap<String, Object> flat = mapper.convertValue(view, MAP);
    flat.putAll(related);
    return flat;
  }
}
