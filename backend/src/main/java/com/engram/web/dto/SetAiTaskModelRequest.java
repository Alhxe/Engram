package com.engram.web.dto;

import com.engram.ai.AiProviderType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SetAiTaskModelRequest(
        @NotNull AiProviderType provider,
        @NotBlank String model,
        boolean enabled) {
}
