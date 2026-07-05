package com.engram.web.dto;

import com.engram.model.ApiKeyScope;
import jakarta.validation.constraints.NotBlank;

public record CreateApiKeyRequest(
        @NotBlank String name,
        ApiKeyScope scope,
        Integer expiresInDays) {
}
