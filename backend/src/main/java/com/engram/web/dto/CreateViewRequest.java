package com.engram.web.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateViewRequest(
        @NotBlank String name,
        String mode,
        String groupBy,
        String dateBy,
        String sortCol,
        int sortDir,
        String filterText) {
}
