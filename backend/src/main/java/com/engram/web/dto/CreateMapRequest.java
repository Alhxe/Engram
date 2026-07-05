package com.engram.web.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record CreateMapRequest(
        @NotBlank String name,
        UUID parentNodeId) {
}
