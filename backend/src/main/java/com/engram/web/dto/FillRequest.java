package com.engram.web.dto;

import com.engram.model.PropertyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Fill one property across every sub-page of a parent, using AI on each page's content. */
public record FillRequest(
        @NotNull UUID parentId,
        @NotBlank String name,
        PropertyType type,
        @NotBlank String instruction) {
}
