package com.engram.web.dto;

import com.engram.model.PropertyType;

public record PropertySuggestion(String name, PropertyType type, String value, String reason) {
}
