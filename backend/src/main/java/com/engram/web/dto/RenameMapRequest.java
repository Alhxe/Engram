package com.engram.web.dto;

import jakarta.validation.constraints.NotBlank;

public record RenameMapRequest(
        @NotBlank String name) {
}
