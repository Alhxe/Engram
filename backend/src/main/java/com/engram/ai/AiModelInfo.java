package com.engram.ai;

/** A selectable model, with pricing (USD per million tokens) for the UI. */
public record AiModelInfo(
        AiProviderType provider,
        String id,
        String label,
        AiModelTier tier,
        double inputPricePerMillion,
        double outputPricePerMillion) {
}
