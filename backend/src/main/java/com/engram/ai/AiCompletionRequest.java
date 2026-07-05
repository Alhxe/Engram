package com.engram.ai;

/**
 * A single AI completion call. {@code system} may be null. {@code maxTokens}
 * caps output (the expensive side) — keep it tight per task.
 */
public record AiCompletionRequest(
        String apiKey,
        String model,
        String system,
        String prompt,
        int maxTokens,
        String baseUrl) {
}
