package com.engram.web.dto;

import com.engram.model.PropertyType;

public record PlannedProperty(String name, PropertyType type, String value) {
}
