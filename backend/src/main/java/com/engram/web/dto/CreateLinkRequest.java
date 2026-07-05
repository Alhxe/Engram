package com.engram.web.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateLinkRequest(
        @NotNull UUID sourceId,
        @NotNull UUID targetId,
        String relType) {
}
