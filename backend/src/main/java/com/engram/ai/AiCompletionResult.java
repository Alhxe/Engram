package com.engram.ai;

/** Result of an AI completion, with token usage for cost tracking. */
public record AiCompletionResult(String text, int inputTokens, int outputTokens) {
}
