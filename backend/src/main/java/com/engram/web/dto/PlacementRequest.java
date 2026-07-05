package com.engram.web.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record PlacementRequest(
        @NotNull UUID nodeId,
        double x,
        double y,
        String color) {
}
