package com.engram.web.dto;

import com.engram.model.PropertyType;
import jakarta.validation.constraints.NotBlank;

public record PropertyDto(
        @NotBlank String name,
        PropertyType type,
        String value) {
}
