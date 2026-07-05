package com.engram.web.dto;

import com.engram.ai.AiProviderType;
import jakarta.validation.constraints.NotNull;

/** apiKey may be blank for a CUSTOM endpoint that needs no key (e.g. a local model). */
public record SetAiCredentialRequest(
        @NotNull AiProviderType provider,
        String apiKey,
        String baseUrl) {
}
