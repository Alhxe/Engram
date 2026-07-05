package com.engram.web.dto;

import java.time.Instant;
import java.util.UUID;

public record LinkResponse(
        UUID id,
        UUID sourceId,
        UUID targetId,
        String relType,
        Instant createdAt) {
}
