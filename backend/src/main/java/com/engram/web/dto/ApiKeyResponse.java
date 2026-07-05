package com.engram.web.dto;

import com.engram.model.ApiKeyScope;
import java.time.Instant;
import java.util.UUID;

public record ApiKeyResponse(
        UUID id,
        String name,
        ApiKeyScope scope,
        Instant createdAt,
        Instant expiresAt,
        Instant lastUsedAt,
        boolean revoked) {
}
