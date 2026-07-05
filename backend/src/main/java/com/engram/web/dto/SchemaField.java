package com.engram.web.dto;

import com.engram.model.PropertyType;
import java.util.List;

/** One property in a collection's schema. For SELECT/MULTISELECT, {@code options}
 *  may declare the allowed values (null = free text). */
public record SchemaField(String name, PropertyType type, List<String> options) {
}
