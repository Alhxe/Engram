package com.engram.web.dto;

import com.engram.ai.AiProviderType;

public record AiModelResponse(
        AiProviderType provider,
        String id,
        String label,
        String tier,
        double inputPricePerMillion,
        double outputPricePerMillion) {
}
